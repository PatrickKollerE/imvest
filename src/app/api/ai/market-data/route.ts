import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function GET(req: Request) {
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { searchParams } = new URL(req.url);
	const address = searchParams.get("address");
	const city = searchParams.get("city");

	// Mock AI market data - in production, this would call a real AI service
	const mockMarketData = {
		estimatedValue: Math.floor(Math.random() * 200000) + 200000, // €200k-400k
		pricePerSqm: Math.floor(Math.random() * 2000) + 3000, // €3k-5k per m²
		marketTrend: Math.random() > 0.5 ? "rising" : "stable",
		rentalYield: (Math.random() * 2 + 3).toFixed(1), // 3-5%
		demandScore: Math.floor(Math.random() * 40) + 60, // 60-100
		recommendation: Math.random() > 0.3 ? "buy" : "hold",
		keyInsights: [
			"High demand area with good transport connections",
			"Recent price increases in the neighborhood",
			"Strong rental market with low vacancy rates",
			"Potential for value appreciation over 5 years"
		],
		comparableProperties: [
			{
				address: "123 Nearby Street",
				price: Math.floor(Math.random() * 100000) + 250000,
				pricePerSqm: Math.floor(Math.random() * 1000) + 3500,
				soldDate: "2024-01-15"
			},
			{
				address: "456 Similar Avenue", 
				price: Math.floor(Math.random() * 100000) + 250000,
				pricePerSqm: Math.floor(Math.random() * 1000) + 3500,
				soldDate: "2024-02-03"
			}
		]
	};

	// Simulate API delay
	await new Promise(resolve => setTimeout(resolve, 1000));

	return NextResponse.json({
		...mockMarketData,
		generatedAt: new Date().toISOString(),
		location: `${address}, ${city}`,
		note: "This is mock data for demonstration purposes. In production, this would be real AI-generated market analysis."
	});
}
