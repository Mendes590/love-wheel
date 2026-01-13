import GiftWheelClient from "./wheel-client";

export default async function GiftPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <GiftWheelClient slug={slug} />;
}
