import { PageHeader } from "@/components/page-header";
import { NewsClient } from "@/components/news/news-client";

export const metadata = { title: "News · Basis" };

export default function NewsPage() {
  return (
    <div>
      <PageHeader
        title="News"
        description="Market headlines from the live data provider — never fabricated"
      />
      <NewsClient />
    </div>
  );
}
