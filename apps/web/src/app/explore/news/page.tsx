import { getNews } from '@/lib/explore';
import { ExploreHeader } from '@/components/explore/explore-header';
import { NewsFeed } from '@/components/explore/news-feed';

export const metadata = {
  title: 'Industry News · Explore · Brigade',
};

export default function NewsPage() {
  const news = getNews();

  return (
    <div>
      <ExploreHeader
        title="📰 Industry News"
        description="Hospitality headlines from across Toronto and Canada — openings, labour, policy and tech. Filter by topic, then take the conversation to your feed."
      />
      <NewsFeed items={news} />
    </div>
  );
}
