from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import finnhub
from datetime import datetime, timedelta
import logging
import firebase_admin
from firebase_admin import credentials, firestore, auth
import jwt
from functools import wraps
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Initialize Firebase Admin
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# API keys
FINNHUB_KEY = os.getenv('FINNHUB_API_KEY')
NEWS_API_KEY = os.getenv('NEWS_API_KEY')

if not all([FINNHUB_KEY, NEWS_API_KEY]):
    logger.error("Missing required API keys!")
    raise ValueError("Missing required API keys!")

# Initialize Finnhub client
try:
    finnhub_client = finnhub.Client(api_key=FINNHUB_KEY)
except Exception as e:
    logger.error(f"Error initializing Finnhub client: {str(e)}")
    raise

# Token required decorator


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            # Verify the Firebase ID token
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token['uid']
            # Get user from Firebase
            current_user = auth.get_user(uid)
            logger.info(f"Authenticated user: {current_user.uid}")
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            return jsonify({'error': 'Token is invalid'}), 401

        return f(current_user, *args, **kwargs)
    return decorated


@app.route('/')
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()

    if not all(k in data for k in ['username', 'email', 'password']):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        # Create user in Firebase Authentication
        user = auth.create_user(
            email=data['email'],
            password=data['password'],
            display_name=data['username']
        )

        # Create user document in Firestore
        db.collection('users').document(user.uid).set({
            'username': data['username'],
            'email': data['email'],
            'created_at': datetime.utcnow(),
            'balance': 10000.0  # Default starting balance
        })

        # Generate a custom token for the client
        custom_token = auth.create_custom_token(user.uid)

        return jsonify({
            'message': 'User created successfully',
            'token': custom_token.decode('utf-8') if isinstance(custom_token, bytes) else custom_token
        }), 201
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': str(e)}), 400


@app.route('/api/auth/login', methods=['POST'])
def login():
    # This endpoint is no longer needed as Firebase handles authentication directly
    # But we'll keep it for compatibility with existing code
    return jsonify({
        'message': 'Please use Firebase authentication directly'
    }), 200


@app.route('/api/trading/balance', methods=['GET'])
@token_required
def get_balance(current_user):
    try:
        # Get user's portfolio from Firestore
        portfolio_ref = db.collection('portfolios').where(
            'user_id', '==', current_user.uid)
        portfolio_docs = portfolio_ref.stream()

        portfolio_data = []
        total_value = 0

        # Get user's balance
        user_doc = db.collection('users').document(current_user.uid).get()
        user_data = user_doc.to_dict()
        balance = user_data.get('balance', 0.0)
        total_value = balance

        for doc in portfolio_docs:
            position = doc.to_dict()
            try:
                quote = finnhub_client.quote(position['symbol'])
                current_price = quote['c']
                position_value = current_price * position['shares']
                total_value += position_value

                portfolio_data.append({
                    'symbol': position['symbol'],
                    'shares': position['shares'],
                    'current_price': current_price,
                    'position_value': position_value
                })
            except Exception as e:
                logger.error(
                    f"Error fetching quote for {position['symbol']}: {str(e)}")

        return jsonify({
            'cash_balance': balance,
            'portfolio': portfolio_data,
            'total_value': total_value
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/trading/add-funds', methods=['POST'])
@token_required
def add_funds(current_user):
    data = request.get_json()
    amount = data.get('amount')

    if not amount or amount <= 0:
        return jsonify({'error': 'Invalid amount'}), 400

    try:
        user_ref = db.collection('users').document(current_user.uid)
        user_doc = user_ref.get()
        current_balance = user_doc.to_dict().get('balance', 0.0)
        new_balance = current_balance + amount

        user_ref.update({'balance': new_balance})

        return jsonify({
            'message': 'Funds added successfully',
            'new_balance': new_balance
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/trading/buy', methods=['POST'])
@token_required
def buy_stock(current_user):
    data = request.get_json()
    symbol = data.get('symbol')
    shares = data.get('shares')

    if not all([symbol, shares]) or shares <= 0:
        return jsonify({'error': 'Invalid request parameters'}), 400

    try:
        # Get current stock price
        quote = finnhub_client.quote(symbol)
        price = quote['c']
        total_cost = price * shares

        # Get user's current balance
        user_ref = db.collection('users').document(current_user.uid)
        user_doc = user_ref.get()
        current_balance = user_doc.to_dict().get('balance', 0.0)

        if total_cost > current_balance:
            return jsonify({'error': 'Insufficient funds'}), 400

        # Update or create portfolio position
        portfolio_ref = db.collection('portfolios')
        position_query = portfolio_ref.where(
            'user_id', '==', current_user.uid).where('symbol', '==', symbol)
        position_docs = position_query.stream()

        position_list = list(position_docs)
        if position_list:
            position_doc = position_list[0]
            current_shares = position_doc.to_dict()['shares']
            portfolio_ref.document(position_doc.id).update({
                'shares': current_shares + shares,
                'updated_at': datetime.utcnow()
            })
        else:
            portfolio_ref.add({
                'user_id': current_user.uid,
                'symbol': symbol,
                'shares': shares,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })

        # Create transaction record
        db.collection('transactions').add({
            'user_id': current_user.uid,
            'symbol': symbol,
            'shares': shares,
            'price': price,
            'type': 'buy',
            'created_at': datetime.utcnow()
        })

        # Update user balance
        new_balance = current_balance - total_cost
        user_ref.update({'balance': new_balance})

        return jsonify({
            'message': 'Stock purchased successfully',
            'new_balance': new_balance
        })

    except Exception as e:
        logger.error(f"Error processing buy order: {str(e)}")
        return jsonify({'error': 'Failed to process purchase'}), 400


@app.route('/api/trading/sell', methods=['POST'])
@token_required
def sell_stock(current_user):
    data = request.get_json()
    symbol = data.get('symbol')
    shares = data.get('shares')

    if not all([symbol, shares]) or shares <= 0:
        return jsonify({'error': 'Invalid request parameters'}), 400

    try:
        # Check if user owns enough shares
        portfolio_ref = db.collection('portfolios')
        position_query = portfolio_ref.where(
            'user_id', '==', current_user.uid).where('symbol', '==', symbol)
        position_docs = position_query.stream()

        position_list = list(position_docs)
        if not position_list or position_list[0].to_dict()['shares'] < shares:
            return jsonify({'error': 'Insufficient shares'}), 400

        position_doc = position_list[0]
        current_shares = position_doc.to_dict()['shares']

        # Get current stock price
        quote = finnhub_client.quote(symbol)
        price = quote['c']
        total_value = price * shares

        # Update portfolio
        if current_shares == shares:
            portfolio_ref.document(position_doc.id).delete()
        else:
            portfolio_ref.document(position_doc.id).update({
                'shares': current_shares - shares,
                'updated_at': datetime.utcnow()
            })

        # Create transaction record
        db.collection('transactions').add({
            'user_id': current_user.uid,
            'symbol': symbol,
            'shares': shares,
            'price': price,
            'type': 'sell',
            'created_at': datetime.utcnow()
        })

        # Update user balance
        user_ref = db.collection('users').document(current_user.uid)
        user_doc = user_ref.get()
        current_balance = user_doc.to_dict().get('balance', 0.0)
        new_balance = current_balance + total_value
        user_ref.update({'balance': new_balance})

        return jsonify({
            'message': 'Stock sold successfully',
            'new_balance': new_balance
        })

    except Exception as e:
        logger.error(f"Error processing sell order: {str(e)}")
        return jsonify({'error': 'Failed to process sale'}), 400


@app.route('/api/trading/transactions', methods=['GET'])
@token_required
def get_transactions(current_user):
    try:
        transactions_ref = db.collection('transactions')
        query = transactions_ref.where('user_id', '==', current_user.uid).order_by(
            'created_at', direction=firestore.Query.DESCENDING)
        transactions = query.stream()

        return jsonify([{
            'id': doc.id,
            'symbol': doc.to_dict()['symbol'],
            'shares': doc.to_dict()['shares'],
            'price': doc.to_dict()['price'],
            'type': doc.to_dict()['type'],
            'total': doc.to_dict()['price'] * doc.to_dict()['shares'],
            'created_at': doc.to_dict()['created_at'].isoformat()
        } for doc in transactions])
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/discussions', methods=['GET'])
@token_required
def get_discussions(current_user):
    try:
        messages_ref = db.collection('messages')
        query = messages_ref.order_by(
            'created_at', direction=firestore.Query.DESCENDING).limit(50)
        messages = query.stream()

        return jsonify([{
            'id': doc.id,
            'content': doc.to_dict()['content'],
            'username': doc.to_dict()['username'],
            'created_at': doc.to_dict()['created_at'].isoformat()
        } for doc in messages])
    except Exception as e:
        logger.error(f"Error fetching discussions: {str(e)}")
        return jsonify({'error': str(e)}), 400


@app.route('/api/discussions', methods=['POST'])
@token_required
def create_discussion(current_user):
    try:
        data = request.get_json()
        content = data.get('content')

        if not content:
            return jsonify({'error': 'Message content is required'}), 400

        # Get user data
        user_doc = db.collection('users').document(current_user.uid).get()
        user_data = user_doc.to_dict()

        # Create message
        message_ref = db.collection('messages').add({
            'content': content,
            'user_id': current_user.uid,
            'username': user_data['username'],
            'created_at': datetime.utcnow()
        })

        message_doc = message_ref[1].get()
        message_data = message_doc.to_dict()

        return jsonify({
            'id': message_doc.id,
            'content': message_data['content'],
            'username': message_data['username'],
            'created_at': message_data['created_at'].isoformat()
        }), 201
    except Exception as e:
        logger.error(f"Error creating discussion: {str(e)}")
        return jsonify({'error': str(e)}), 400


@app.route('/api/market/top-gainers', methods=['GET'])
def get_top_gainers():
    try:
        # Get market news from Finnhub to identify active stocks
        market_news = finnhub_client.general_news('general', min_id=0)
        mentioned_symbols = set()

        # Extract unique stock symbols from news
        for news in market_news:
            if 'related' in news:
                symbols = news['related'].split(',')
                mentioned_symbols.update(symbols)

        # Get quotes for mentioned symbols
        gainers = []
        for symbol in mentioned_symbols:
            try:
                quote = finnhub_client.quote(symbol)
                # Only include stocks with positive price change
                if quote and quote['dp'] and quote['dp'] > 0:
                    gainers.append({
                        'symbol': symbol,
                        'price': quote['c'],
                        'change': quote['dp']
                    })
            except Exception as e:
                logger.error(f"Error fetching quote for {symbol}: {str(e)}")
                continue

        # Sort by percentage change (descending) and take top 5
        gainers.sort(key=lambda x: x['change'], reverse=True)
        return jsonify(gainers[:5])
    except Exception as e:
        logger.error(f"Error fetching top gainers: {str(e)}")
        return jsonify({'error': str(e)}), 400


@app.route('/api/search', methods=['GET'])
def search_stocks():
    try:
        query = request.args.get('q', '')
        if not query or len(query) < 1:
            return jsonify({'result': []})

        # Search for stocks using Finnhub
        search_results = finnhub_client.symbol_lookup(query)

        if not search_results or 'result' not in search_results:
            return jsonify({'result': []})

        # Filter to US stocks only and limit to 10 results
        filtered_results = []
        for stock in search_results['result']:
            if stock['type'] == 'Common Stock' and (stock['exchange'] == 'NYSE' or stock['exchange'] == 'NASDAQ'):
                try:
                    # Get current price and price change
                    quote = finnhub_client.quote(stock['symbol'])
                    if quote and 'c' in quote:
                        filtered_results.append({
                            'symbol': stock['symbol'],
                            'description': stock['description'],
                            'displaySymbol': stock['displaySymbol'],
                            'type': stock['type'],
                            'name': stock['description'],
                            'price': quote['c'],
                            'change': quote['dp']  # Percentage change
                        })
                except Exception as e:
                    logger.error(
                        f"Error fetching quote for {stock['symbol']}: {str(e)}")
                    continue

                if len(filtered_results) >= 10:
                    break

        return jsonify({'result': filtered_results})
    except Exception as e:
        logger.error(f"Error searching stocks: {str(e)}")
        return jsonify({'error': str(e), 'result': []}), 400


@app.route('/api/stock/<symbol>', methods=['GET'])
def get_stock(symbol):
    try:
        # Get real-time quote from Finnhub
        quote = finnhub_client.quote(symbol)
        if not quote or 'c' not in quote:
            return jsonify({'error': f'No quote data available for {symbol}'}), 404

        # Get company profile from Finnhub
        profile = finnhub_client.company_profile2(symbol=symbol)
        if not profile:
            profile = {
                'name': f"{symbol}",
                'exchange': 'Unknown',
                'finnhubIndustry': 'Unknown'
            }

        # Get historical candle data (30 days)
        end_date = int(datetime.now().timestamp())
        start_date = int((datetime.now() - timedelta(days=30)).timestamp())
        candles = finnhub_client.stock_candles(
            symbol, 'D', start_date, end_date)

        historical = []
        if candles and candles['s'] == 'ok' and len(candles['t']) > 0:
            for i in range(len(candles['t'])):
                historical.append({
                    'date': datetime.fromtimestamp(candles['t'][i]).strftime('%Y-%m-%d'),
                    'close': str(candles['c'][i])
                })
        else:
            return jsonify({'error': f'No historical data available for {symbol}'}), 404

        return jsonify({
            'quote': quote,
            'profile': profile,
            'historical': historical
        })
    except Exception as e:
        logger.error(f"Error fetching stock data for {symbol}: {str(e)}")
        return jsonify({'error': str(e)}), 400


@app.route('/api/stock/<symbol>/news', methods=['GET'])
def get_stock_news(symbol):
    try:
        # Use mock news data instead of Finnhub API
        mock_news = [
            {
                'category': 'technology',
                'datetime': int(datetime.now().timestamp()) - 3600,
                'headline': f'{symbol} Announces New Product Line',
                'id': 1,
                'image': 'https://via.placeholder.com/640x360',
                'related': symbol,
                'source': 'Business Insider',
                'summary': f'{symbol} is set to release a new line of products that could revolutionize the industry.',
                'url': f'https://example.com/news/{symbol.lower()}/new-product'
            },
            {
                'category': 'business',
                'datetime': int(datetime.now().timestamp()) - 7200,
                'headline': f'{symbol} Reports Strong Quarterly Earnings',
                'id': 2,
                'image': 'https://via.placeholder.com/640x360',
                'related': symbol,
                'source': 'CNBC',
                'summary': f'{symbol} exceeded analyst expectations with its latest quarterly results.',
                'url': f'https://example.com/news/{symbol.lower()}/earnings'
            },
            {
                'category': 'technology',
                'datetime': int(datetime.now().timestamp()) - 10800,
                'headline': f'{symbol} Partners with Major Tech Company',
                'id': 3,
                'image': 'https://via.placeholder.com/640x360',
                'related': symbol,
                'source': 'TechCrunch',
                'summary': f'{symbol} has announced a strategic partnership that could boost its market position.',
                'url': f'https://example.com/news/{symbol.lower()}/partnership'
            }
        ]

        return jsonify(mock_news)
    except Exception as e:
        logger.error(f"Error fetching news for {symbol}: {str(e)}")
        return jsonify({'error': str(e)}), 400


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
