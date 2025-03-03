import os
import logging
import json
import random
from datetime import datetime, timedelta
from functools import wraps

import finnhub
import jwt
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, auth

from ml_service import StockAnalyzer

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
try:
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    logger.info("Firebase initialized successfully")
except Exception as e:
    logger.warning(f"Firebase initialization failed: {str(e)}")
    logger.warning("Running in development mode with mock Firebase")

    # Create mock Firebase functionality
    class MockFirestore:
        def __init__(self):
            self.collections = {}
            self.next_id = 1  # Global ID counter for all collections

        def collection(self, name):
            if name not in self.collections:
                self.collections[name] = MockCollection(name)
            return self.collections[name]

    class MockCollection:
        def __init__(self, name):
            self.name = name
            self.documents = {}
            self.next_id = 1  # Collection-specific ID counter

        def document(self, doc_id=None):
            if doc_id is None:
                doc_id = f"auto-id-{self.next_id}"
                self.next_id += 1

            if doc_id not in self.documents:
                self.documents[doc_id] = MockDocument(doc_id)
            return self.documents[doc_id]

        def where(self, field, op, value):
            # Implement basic filtering
            filtered_docs = []
            for doc_id, doc in self.documents.items():
                doc_data = doc.to_dict()
                if field in doc_data:
                    if op == '==' and doc_data[field] == value:
                        filtered_docs.append(doc)
                    elif op == '>' and doc_data[field] > value:
                        filtered_docs.append(doc)
                    elif op == '>=' and doc_data[field] >= value:
                        filtered_docs.append(doc)
                    elif op == '<' and doc_data[field] < value:
                        filtered_docs.append(doc)
                    elif op == '<=' and doc_data[field] <= value:
                        filtered_docs.append(doc)

            logger.info(
                f"Collection {self.name} where {field} {op} {value} found {len(filtered_docs)} documents")
            return MockQuery(filtered_docs)

        def stream(self):
            docs = list(self.documents.values())
            logger.info(
                f"Collection {self.name} stream returning {len(docs)} documents")
            return docs

        def add(self, data):
            doc_id = f"auto-id-{self.next_id}"
            self.next_id += 1
            doc = self.document(doc_id)
            doc.set(data)
            logger.info(
                f"Added document to {self.name} with ID {doc_id}: {data}")
            return doc

    class MockDocument:
        def __init__(self, doc_id):
            self.id = doc_id
            self.data = {}

        def set(self, data, merge=False):
            if merge:
                self.data.update(data)
            else:
                self.data = data.copy() if isinstance(data, dict) else data
            logger.info(f"Document {self.id} set with data: {self.data}")
            return self

        def get(self):
            logger.info(f"Getting document {self.id} with data: {self.data}")
            return self

        def to_dict(self):
            return self.data.copy() if isinstance(self.data, dict) else self.data

        def update(self, data):
            if isinstance(self.data, dict) and isinstance(data, dict):
                self.data.update(data)
                logger.info(f"Updated document {self.id} with data: {data}")
            return self

    class MockQuery:
        def __init__(self, documents=None):
            self.documents = documents or []
            self._filters = []

        def stream(self):
            # Apply all filters in sequence
            filtered_docs = self.documents
            for field, op, value in self._filters:
                filtered_docs = [
                    doc for doc in filtered_docs
                    if field in doc.to_dict() and self._compare(doc.to_dict()[field], op, value)
                ]
            logger.info(
                f"MockQuery stream returning {len(filtered_docs)} documents")
            return filtered_docs

        def where(self, field, op, value):
            # Store the filter and return a new query
            new_query = MockQuery(self.documents)
            new_query._filters = self._filters.copy()
            new_query._filters.append((field, op, value))
            return new_query

        def _compare(self, field_value, op, value):
            if op == '==':
                return field_value == value
            elif op == '>':
                return field_value > value
            elif op == '>=':
                return field_value >= value
            elif op == '<':
                return field_value < value
            elif op == '<=':
                return field_value <= value
            return False

    # Use mock implementations
    db = MockFirestore()

    # Mock auth module
    class MockAuth:
        def verify_id_token(self, token):
            # For development, return a mock user
            return {
                "uid": "mock-user-id",
                "email": "mock@example.com",
                "name": "Mock User"
            }

    # Replace auth module with mock
    auth = MockAuth()

# API keys
FINNHUB_KEY = os.getenv('FINNHUB_API_KEY')
NEWS_API_KEY = os.getenv('NEWS_API_KEY')

# Use default values for development if keys are missing
if not FINNHUB_KEY:
    logger.warning(
        "FINNHUB_API_KEY not found, using development mode with limited functionality")
    FINNHUB_KEY = "sandbox_dummy_key"  # This won't work for real API calls

if not NEWS_API_KEY:
    logger.warning(
        "NEWS_API_KEY not found, using development mode with mock news data")
    NEWS_API_KEY = "dummy_key"  # This won't work for real API calls

# Initialize Finnhub client
finnhub_client = finnhub.Client(api_key=FINNHUB_KEY)

# Initialize ML service
stock_analyzer = StockAnalyzer(api_key=FINNHUB_KEY)

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

            # Create a user object with the necessary attributes
            class MockUser:
                def __init__(self, uid, email=None, display_name=None):
                    self.uid = uid
                    self.email = email
                    self.display_name = display_name

            # Check if we're using the real Firebase or our mock
            if hasattr(auth, 'get_user'):
                # Get user from Firebase
                current_user = auth.get_user(uid)
            else:
                # Create a mock user
                current_user = MockUser(uid, email=decoded_token.get(
                    'email'), display_name=decoded_token.get('name'))

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
        # Get user's balance
        try:
            user_doc = db.collection('users').document(current_user.uid).get()
            user_data = user_doc.to_dict() or {}
            balance = user_data.get('balance', 0.0)
            logger.info(f"User {current_user.uid} has balance: {balance}")
        except Exception as e:
            logger.error(f"Error fetching user balance: {str(e)}")
            balance = 0.0

        # Initialize total value with cash balance
        total_value = balance

        # Get user's portfolio from Firestore
        portfolio_data = []

        try:
            # Log the current user ID for debugging
            logger.info(f"Fetching portfolio for user: {current_user.uid}")

            # Get all portfolio documents for this user
            portfolio_ref = db.collection('portfolios')

            # Debug the contents of the portfolios collection
            all_portfolios = list(portfolio_ref.stream())
            logger.info(
                f"Total documents in portfolios collection: {len(all_portfolios)}")
            for doc in all_portfolios:
                logger.info(
                    f"Portfolio document in collection: {doc.id} - {doc.to_dict()}")

            # Query for this user's portfolio
            logger.info(
                f"Querying portfolios where user_id == {current_user.uid}")
            user_portfolio_docs = []
            for doc in all_portfolios:
                doc_data = doc.to_dict()
                if doc_data.get('user_id') == current_user.uid:
                    user_portfolio_docs.append(doc)

            logger.info(
                f"Found {len(user_portfolio_docs)} portfolio documents for user {current_user.uid}")

            for doc in user_portfolio_docs:
                position = doc.to_dict()
                logger.info(
                    f"Processing portfolio position: {doc.id} - {position}")

                symbol = position.get('symbol', '')
                shares = position.get('shares', 0)

                if not symbol or shares <= 0:
                    logger.info(f"Skipping invalid position: {position}")
                    continue

                # Try to get current price from Finnhub
                try:
                    quote = finnhub_client.quote(symbol)
                    if quote and 'c' in quote and quote['c'] > 0:
                        current_price = quote['c']
                    else:
                        # Use last known price or default
                        current_price = position.get('last_price', 0.0)
                except Exception as e:
                    logger.error(
                        f"Error fetching quote for {symbol}: {str(e)}")
                    current_price = position.get('last_price', 0.0)

                position_value = current_price * shares
                total_value += position_value

                portfolio_data.append({
                    'symbol': symbol,
                    'shares': shares,
                    'current_price': current_price,
                    'position_value': position_value
                })

                logger.info(
                    f"Added position to portfolio data: {symbol}, {shares} shares, value: {position_value}")
        except Exception as e:
            logger.error(f"Error processing portfolio: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())

        # Log the final response for debugging
        response_data = {
            'cash_balance': balance,
            'portfolio': portfolio_data,
            'total_value': total_value
        }
        logger.info(f"Returning balance response: {response_data}")

        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error in get_balance: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        # Return default values instead of error
        return jsonify({
            'cash_balance': 0.0,
            'portfolio': [],
            'total_value': 0.0
        })


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
def buy(current_user):
    # Get request data
    data = request.json
    symbol = data.get('symbol')
    shares = data.get('shares')
    analyze_first = data.get('analyze_first', False)
    days = data.get('days', 14)  # Default to 14 days if not specified
    # Default to 'none' if not specified
    indicator = data.get('indicator', 'none')

    if not symbol or not shares:
        return jsonify({'error': 'Symbol and shares are required'}), 400

    try:
        # Convert shares to float
        shares = float(shares)
        if shares <= 0:
            return jsonify({'error': 'Shares must be positive'}), 400
    except ValueError:
        return jsonify({'error': 'Shares must be a number'}), 400

    try:
        # Get current stock price
        quote = finnhub_client.quote(symbol)
        current_price = quote['c']

        if current_price == 0:
            return jsonify({'error': 'Could not get current price for this stock'}), 400

        # Calculate total cost
        total_cost = current_price * shares

        # If analyze_first is True, analyze the stock before buying
        if analyze_first:
            try:
                logger.info(
                    f"Analyzing stock {symbol} before buying with days={days} and indicator={indicator}")
                # Initialize the stock analyzer
                analyzer = StockAnalyzer()

                # Analyze the stock with the specified days and indicator
                analysis_result = analyzer.analyze_stock(
                    symbol, forecast_days=days, indicator=indicator)

                logger.info(f"Analysis result: {analysis_result}")

                # Prepare the analysis response
                analysis = {
                    'symbol': symbol,
                    'current_price': analysis_result['current_price'],
                    'predicted_price': analysis_result['current_price'] * (1 + analysis_result['expected_growth_pct'] / 100),
                    'total_cost': total_cost,
                    'is_good_buy': analysis_result['is_good_buy'],
                    'expected_growth': analysis_result['expected_growth_pct'],
                    # Convert to 0-1 scale
                    'confidence': analysis_result['confidence_score'] / 100,
                    'forecast': analysis_result['forecast_prices'],
                    'days': days
                }

                # Add indicator data if available
                if 'indicator_data' in analysis_result and analysis_result['indicator_data']:
                    analysis['indicator'] = analysis_result['indicator_data']

                logger.info(f"Returning analysis to client: {analysis}")
                return jsonify({'analysis': analysis})
            except Exception as e:
                logger.error(f"Error analyzing stock: {str(e)}")
                # Continue with the purchase if analysis fails

        # Check if user has enough balance
        user_ref = db.collection('users').document(current_user.uid)
        user_doc = user_ref.get()
        user_data = user_doc.to_dict()

        if not user_data or 'balance' not in user_data:
            return jsonify({'error': 'User data not found'}), 404

        balance = user_data['balance']

        if balance < total_cost:
            return jsonify({'error': 'Insufficient funds'}), 400

        # Update user's balance
        new_balance = balance - total_cost
        user_ref.update({'balance': new_balance})

        # Add stock to user's portfolio or update existing position
        try:
            portfolio_ref = db.collection('portfolios')

            # Log all portfolio documents before the query
            all_portfolios = list(portfolio_ref.stream())
            logger.info(
                f"Before update: Total documents in portfolios collection: {len(all_portfolios)}")
            for doc in all_portfolios:
                logger.info(
                    f"Before update: Portfolio document: {doc.to_dict()}")

            # First query for user's documents
            user_portfolio_query = portfolio_ref.where(
                'user_id', '==', current_user.uid)
            user_portfolio_docs = list(user_portfolio_query.stream())
            logger.info(
                f"Found {len(user_portfolio_docs)} portfolio documents for user {current_user.uid}")

            # Then filter for the specific symbol
            matching_docs = []
            for doc in user_portfolio_docs:
                doc_data = doc.to_dict()
                if doc_data.get('symbol') == symbol:
                    matching_docs.append(doc)

            logger.info(
                f"Found {len(matching_docs)} matching documents for symbol {symbol}")

            if matching_docs:
                # Update existing position
                position_doc = matching_docs[0]
                position_data = position_doc.to_dict()
                existing_shares = position_data.get('shares', 0)
                existing_cost = position_data.get('cost_basis', current_price)

                # Calculate new average cost basis
                new_shares = existing_shares + shares
                new_cost_basis = (existing_cost * existing_shares +
                                  current_price * shares) / new_shares

                logger.info(
                    f"Updating existing position: {position_doc.id} - {symbol} from {existing_shares} to {new_shares} shares")
                portfolio_ref.document(position_doc.id).update({
                    'shares': new_shares,
                    'cost_basis': new_cost_basis,
                    'last_price': current_price,
                    'updated_at': datetime.utcnow()
                })
            else:
                # Create new position
                new_position = {
                    'user_id': current_user.uid,
                    'symbol': symbol,
                    'shares': shares,
                    'cost_basis': current_price,
                    'last_price': current_price,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
                logger.info(
                    f"Creating new position: {symbol} with {shares} shares for user {current_user.uid}")
                new_doc = portfolio_ref.add(new_position)
                # The MockFirestore add method returns a tuple, not a document reference
                if isinstance(new_doc, tuple):
                    doc_id = new_doc[0]
                    logger.info(f"Created new position with ID: {doc_id}")
                else:
                    logger.info(f"Created new position with ID: {new_doc.id}")

            # Log all portfolio documents after the update
            all_portfolios = list(portfolio_ref.stream())
            logger.info(
                f"After update: Total documents in portfolios collection: {len(all_portfolios)}")
            for doc in all_portfolios:
                logger.info(
                    f"After update: Portfolio document: {doc.to_dict()}")

        except Exception as e:
            logger.error(f"Error updating portfolio: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            # Continue with transaction recording even if portfolio update fails

        # Record the transaction
        transaction_ref = db.collection('transactions').add({
            'user_id': current_user.uid,
            'symbol': symbol,
            'shares': shares,
            'price': current_price,
            'total': total_cost,
            'type': 'buy',
            'created_at': datetime.utcnow()
        })

        return jsonify({
            'success': True,
            'message': f'Successfully bought {shares} shares of {symbol}',
            'new_balance': new_balance
        })
    except Exception as e:
        logger.error(f"Error buying stock: {str(e)}")
        return jsonify({'error': f'Failed to buy stock: {str(e)}'}), 500


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
        try:
            portfolio_ref = db.collection('portfolios')
            position_query = portfolio_ref.where(
                'user_id', '==', current_user.uid).where('symbol', '==', symbol)
            position_docs = list(position_query.stream())

            if not position_docs or position_docs[0].to_dict()['shares'] < shares:
                return jsonify({'error': 'Insufficient shares'}), 400

            position_doc = position_docs[0]
            position_data = position_doc.to_dict()
            current_shares = position_data['shares']

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
                    'last_price': price,
                    'updated_at': datetime.utcnow()
                })
        except Exception as e:
            logger.error(f"Error updating portfolio for sell: {str(e)}")
            return jsonify({'error': 'Failed to update portfolio'}), 400

        # Create transaction record
        try:
            db.collection('transactions').add({
                'user_id': current_user.uid,
                'symbol': symbol,
                'shares': shares,
                'price': price,
                'total': total_value,
                'type': 'sell',
                'created_at': datetime.utcnow()
            })
        except Exception as e:
            logger.error(f"Error recording transaction for sell: {str(e)}")
            # Continue with balance update even if transaction recording fails

        # Update user balance
        try:
            user_ref = db.collection('users').document(current_user.uid)
            user_doc = user_ref.get()
            current_balance = user_doc.to_dict().get('balance', 0.0)
            new_balance = current_balance + total_value
            user_ref.update({'balance': new_balance})
        except Exception as e:
            logger.error(f"Error updating balance for sell: {str(e)}")
            return jsonify({'error': 'Failed to update balance'}), 400

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

        result = []
        for doc in transactions:
            data = doc.to_dict()
            try:
                # Handle potential missing fields
                created_at = data.get('created_at')
                if created_at:
                    if isinstance(created_at, datetime):
                        created_at = created_at.isoformat()
                    else:
                        # If it's a timestamp or something else, convert to string
                        created_at = str(created_at)
                else:
                    created_at = datetime.utcnow().isoformat()

                result.append({
                    'id': doc.id,
                    'symbol': data.get('symbol', ''),
                    'shares': data.get('shares', 0),
                    'price': data.get('price', 0),
                    'type': data.get('type', 'unknown'),
                    'total': data.get('price', 0) * data.get('shares', 0),
                    'created_at': created_at
                })
            except Exception as e:
                logger.error(
                    f"Error processing transaction {doc.id}: {str(e)}")
                # Continue with next transaction instead of failing completely
                continue

        return jsonify(result)
    except Exception as e:
        logger.error(f"Error fetching transactions: {str(e)}")
        # Return empty array instead of error
        return jsonify([])


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
        try:
            market_news = finnhub_client.general_news('general', min_id=0)
            mentioned_symbols = set()

            # Extract unique stock symbols from news
            for news in market_news:
                if 'related' in news:
                    symbols = news['related'].split(',')
                    mentioned_symbols.update(symbols)
        except Exception as e:
            logger.error(f"Error fetching market news: {str(e)}")
            # Fallback to popular stock symbols
            mentioned_symbols = ['AAPL', 'MSFT', 'AMZN', 'GOOGL',
                                 'META', 'TSLA', 'NVDA', 'AMD', 'INTC', 'JPM']

        # Get quotes for mentioned symbols
        gainers = []
        for symbol in mentioned_symbols:
            try:
                quote = finnhub_client.quote(symbol)
                # Check if quote has the required fields
                if quote and 'c' in quote:
                    # Get price change percentage, default to a random positive value if missing
                    dp = quote.get('dp')
                    if dp is None or not isinstance(dp, (int, float)):
                        dp = random.uniform(0.5, 5.0)  # Random positive change

                    # Only include stocks with positive price change
                    if dp > 0:
                        gainers.append({
                            'symbol': symbol,
                            # Default price if missing
                            'price': quote.get('c', 100.0),
                            'change': dp
                        })
            except Exception as e:
                logger.error(f"Error fetching quote for {symbol}: {str(e)}")
                continue

        # If we couldn't get any real gainers, create mock data
        if not gainers:
            logger.warning("No real gainers found, using mock data")
            mock_gainers = [
                {'symbol': 'AAPL', 'price': 175.34, 'change': 2.45},
                {'symbol': 'MSFT', 'price': 328.79, 'change': 1.98},
                {'symbol': 'AMZN', 'price': 178.15, 'change': 1.75},
                {'symbol': 'GOOGL', 'price': 142.56, 'change': 1.52},
                {'symbol': 'NVDA', 'price': 824.12, 'change': 3.21}
            ]
            return jsonify(mock_gainers)

        # Sort by percentage change (descending) and take top 5
        gainers.sort(key=lambda x: x['change'], reverse=True)
        return jsonify(gainers[:5])
    except Exception as e:
        logger.error(f"Error fetching top gainers: {str(e)}")
        # Return mock data in case of any error
        mock_gainers = [
            {'symbol': 'AAPL', 'price': 175.34, 'change': 2.45},
            {'symbol': 'MSFT', 'price': 328.79, 'change': 1.98},
            {'symbol': 'AMZN', 'price': 178.15, 'change': 1.75},
            {'symbol': 'GOOGL', 'price': 142.56, 'change': 1.52},
            {'symbol': 'NVDA', 'price': 824.12, 'change': 3.21}
        ]
        return jsonify(mock_gainers)


@app.route('/api/search', methods=['GET'])
def search_stocks():
    try:
        query = request.args.get('q', '')
        if not query or len(query) < 1:
            return jsonify({'result': []})

        # Search for stocks using Finnhub
        try:
            search_results = finnhub_client.symbol_lookup(query)
        except Exception as e:
            logger.error(f"Error looking up symbols: {str(e)}")
            # Fallback to empty results
            search_results = {'result': []}

        if not search_results or 'result' not in search_results:
            return jsonify({'result': []})

        # Filter to US stocks only and limit to 10 results
        filtered_results = []
        for stock in search_results['result']:
            # Check if required keys exist
            if 'type' not in stock or 'symbol' not in stock:
                continue

            # More flexible exchange check
            is_us_exchange = False
            if 'exchange' in stock:
                is_us_exchange = stock['exchange'] in ['NYSE', 'NASDAQ']

            if stock.get('type') == 'Common Stock' and is_us_exchange:
                try:
                    # Get current price and price change
                    quote = finnhub_client.quote(stock['symbol'])
                    if quote and 'c' in quote:
                        filtered_results.append({
                            'symbol': stock['symbol'],
                            'description': stock.get('description', stock['symbol']),
                            'displaySymbol': stock.get('displaySymbol', stock['symbol']),
                            'type': stock['type'],
                            'name': stock.get('description', stock['symbol']),
                            'price': quote['c'],
                            # Percentage change, default to 0
                            'change': quote.get('dp', 0)
                        })
                except Exception as e:
                    logger.error(
                        f"Error fetching quote for {stock['symbol']}: {str(e)}")
                    # Add the stock with estimated price data
                    filtered_results.append({
                        'symbol': stock['symbol'],
                        'description': stock.get('description', stock['symbol']),
                        'displaySymbol': stock.get('displaySymbol', stock['symbol']),
                        'type': stock['type'],
                        'name': stock.get('description', stock['symbol']),
                        'price': 100.0,  # Default price
                        'change': 0.0    # Default change
                    })

                if len(filtered_results) >= 10:
                    break

        # If no results found and query looks like a valid ticker, create a mock result
        if not filtered_results and len(query) <= 5 and query.isalpha():
            query = query.upper()
            logger.warning(
                f"No search results found for {query}, creating mock result")
            filtered_results.append({
                'symbol': query,
                'description': f"{query} Inc.",
                'displaySymbol': query,
                'type': 'Common Stock',
                'name': f"{query} Inc.",
                'price': 100.0,
                'change': 0.0
            })

        return jsonify({'result': filtered_results})
    except Exception as e:
        logger.error(f"Error searching stocks: {str(e)}")
        # Return empty results instead of error
        return jsonify({'result': []})


@app.route('/api/stock/<symbol>', methods=['GET'])
def get_stock(symbol):
    try:
        # Normalize symbol
        symbol = symbol.upper().strip()

        # Get real-time quote from Finnhub
        try:
            quote = finnhub_client.quote(symbol)
            if not quote or 'c' not in quote:
                # Provide fallback quote data
                logger.warning(
                    f"No quote data available for {symbol}, using fallback")
                quote = {
                    'c': 150.0,  # Current price
                    'h': 155.0,  # High price of the day
                    'l': 145.0,  # Low price of the day
                    'o': 148.0,  # Open price of the day
                    'pc': 149.0,  # Previous close price
                    'd': 1.0,    # Change
                    'dp': 0.67   # Percent change
                }
        except Exception as e:
            logger.error(f"Error fetching quote for {symbol}: {str(e)}")
            # Provide fallback quote data
            quote = {
                'c': 150.0,
                'h': 155.0,
                'l': 145.0,
                'o': 148.0,
                'pc': 149.0,
                'd': 1.0,
                'dp': 0.67
            }

        # Get company profile from Finnhub
        try:
            profile = finnhub_client.company_profile2(symbol=symbol)
            if not profile:
                profile = {
                    'name': f"{symbol}",
                    'exchange': 'NYSE',
                    'finnhubIndustry': 'Technology'
                }
        except Exception as e:
            logger.error(f"Error fetching profile for {symbol}: {str(e)}")
            profile = {
                'name': f"{symbol}",
                'exchange': 'NYSE',
                'finnhubIndustry': 'Technology'
            }

        # Get historical candle data (30 days)
        historical = []
        try:
            end_date = int(datetime.now().timestamp())
            start_date = int((datetime.now() - timedelta(days=30)).timestamp())
            candles = finnhub_client.stock_candles(
                symbol, 'D', start_date, end_date)

            if candles and candles['s'] == 'ok' and len(candles['t']) > 0:
                for i in range(len(candles['t'])):
                    historical.append({
                        'date': datetime.fromtimestamp(candles['t'][i]).strftime('%Y-%m-%d'),
                        'close': str(candles['c'][i])
                    })
            else:
                # Generate mock historical data if API fails
                logger.warning(
                    f"No historical data available for {symbol}, using fallback")
                base_price = quote['c']
                for i in range(30):
                    day = datetime.now() - timedelta(days=i)
                    # Random price fluctuation around base price
                    price = base_price * (1 + (random.random() - 0.5) * 0.1)
                    historical.append({
                        'date': day.strftime('%Y-%m-%d'),
                        'close': str(round(price, 2))
                    })
                # Reverse to get chronological order
                historical.reverse()
        except Exception as e:
            logger.error(
                f"Error fetching historical data for {symbol}: {str(e)}")
            # Generate mock historical data
            base_price = quote['c']
            for i in range(30):
                day = datetime.now() - timedelta(days=i)
                # Random price fluctuation around base price
                price = base_price * (1 + (random.random() - 0.5) * 0.1)
                historical.append({
                    'date': day.strftime('%Y-%m-%d'),
                    'close': str(round(price, 2))
                })
            # Reverse to get chronological order
            historical.reverse()

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
        # Normalize symbol
        symbol = symbol.upper().strip()

        # Try to get real news from Finnhub API
        try:
            # Get news from the last 7 days
            current_time = datetime.now()
            to_date = current_time.strftime('%Y-%m-%d')
            from_date = (current_time - timedelta(days=7)).strftime('%Y-%m-%d')

            news = finnhub_client.company_news(symbol, from_date, to_date)

            # If we got news, process and return it
            if news and len(news) > 0:
                # Process and limit to 10 news items
                processed_news = []
                for item in news[:10]:
                    # Ensure all required fields are present
                    processed_item = {
                        'category': item.get('category', 'general'),
                        'datetime': item.get('datetime', int(datetime.now().timestamp())),
                        'headline': item.get('headline', f'News about {symbol}'),
                        'id': item.get('id', random.randint(1000, 9999)),
                        'image': item.get('image', 'https://via.placeholder.com/640x360'),
                        'related': item.get('related', symbol),
                        'source': item.get('source', 'Financial News'),
                        'summary': item.get('summary', f'Latest news about {symbol}.'),
                        'url': item.get('url', f'https://example.com/news/{symbol.lower()}')
                    }
                    processed_news.append(processed_item)

                return jsonify(processed_news)

        except Exception as e:
            logger.error(
                f"Error fetching news from Finnhub for {symbol}: {str(e)}")
            # Continue to fallback mock data

        # Use mock news data as fallback
        logger.warning(f"Using mock news data for {symbol}")
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
        # Return empty news array instead of error
        return jsonify([])


@app.route('/api/trading/analyze-stock', methods=['GET'])
@token_required
def analyze_stock(current_user):
    # Get the stock symbol from the request
    symbol = request.args.get('symbol', '')
    days = int(request.args.get('days', '14'))
    indicator = request.args.get('indicator', 'none')

    if not symbol:
        return jsonify({'error': 'Stock symbol is required'}), 400

    try:
        # Initialize the stock analyzer
        analyzer = StockAnalyzer()

        # Analyze the stock
        analysis = analyzer.analyze_stock(
            symbol, forecast_days=days, indicator=indicator)

        return jsonify(analysis)
    except Exception as e:
        logger.error(f"Error analyzing stock: {str(e)}")
        return jsonify({'error': 'Failed to analyze stock'}), 500


@app.route('/api/trading/alternative-stocks', methods=['GET'])
@token_required
def alternative_stocks(current_user):
    sector = request.args.get('sector', 'technology')
    budget = float(request.args.get('budget', 1000.0))
    count = int(request.args.get('count', 5))
    # Get days parameter with default of 14
    days = int(request.args.get('days', 14))

    try:
        # Find alternative stocks using the ML service
        alternatives = stock_analyzer.find_alternative_stocks(
            sector=sector,
            budget=budget,
            count=count,
            days=days  # Pass days parameter to the method
        )

        return jsonify({
            'alternatives': alternatives
        })
    except Exception as e:
        logger.error(f"Error finding alternative stocks: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/market/quote', methods=['GET'])
@token_required
def get_stock_quote(current_user):
    """
    Get real-time quote for a stock symbol
    """
    symbol = request.args.get('symbol')
    if not symbol:
        return jsonify({'error': 'Symbol parameter is required'}), 400

    try:
        # Get quote from Finnhub
        quote = finnhub_client.quote(symbol)

        # If quote is empty or invalid, return error
        if not quote or 'c' not in quote:
            return jsonify({'error': f'Could not fetch quote for {symbol}'}), 404

        return jsonify(quote)
    except Exception as e:
        logger.error(f"Error fetching quote for {symbol}: {str(e)}")
        return jsonify({'error': 'Failed to fetch stock quote'}), 500


# Test endpoint without authentication for development
@app.route('/api/test/analyze-stock', methods=['GET'])
def test_analyze_stock():
    # Get the stock symbol from the request
    symbol = request.args.get('symbol', '')
    days = int(request.args.get('days', '14'))
    indicator = request.args.get('indicator', 'none')

    if not symbol:
        return jsonify({'error': 'Stock symbol is required'}), 400

    try:
        # Initialize the stock analyzer
        analyzer = StockAnalyzer()

        # Analyze the stock
        analysis = analyzer.analyze_stock(
            symbol, forecast_days=days, indicator=indicator)

        return jsonify(analysis)
    except Exception as e:
        logger.error(f"Error analyzing stock: {str(e)}")
        return jsonify({'error': 'Failed to analyze stock'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
