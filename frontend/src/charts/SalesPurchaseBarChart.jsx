import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from "recharts";

export default function SalesPurchaseBarChart({ data, onBarClick }) {

    return (
        <div style={{ width: "100%", height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    barCategoryGap={20}
                >

                    {/* GRADIENT COLORS */}
                    <defs>
                        <linearGradient id="purchaseColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        </linearGradient>

                        <linearGradient id="salesColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3}/>
                        </linearGradient>
                    </defs>

                    {/* AXIS */}
                    <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                    />

                    <YAxis />

                    {/* TOOLTIP */}
                    <Tooltip
                        contentStyle={{
                            borderRadius: "10px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                        }}
                        cursor={{ fill: "rgba(0,0,0,0.05)" }}
                    />

                    <Legend />

                    {/* PURCHASE BAR */}
                    <Bar
                        dataKey="purchase"
                        fill="url(#purchaseColor)"
                        name="Total Purchase"
                        radius={[8, 8, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-out"
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`purchase-${index}`}
                                onClick={() => {
                                    if (entry?.week_start && onBarClick) {
                                        onBarClick(entry.week_start);
                                    }
                                }}
                                style={{ cursor: "pointer" }}
                            />
                        ))}
                    </Bar>

                    {/* SALES BAR */}
                    <Bar
                        dataKey="sales"
                        fill="url(#salesColor)"
                        name="Total Sales"
                        radius={[8, 8, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={800}
                        animationEasing="ease-out"
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`sales-${index}`}
                                onClick={() => {
                                    if (entry?.week_start && onBarClick) {
                                        onBarClick(entry.week_start);
                                    }
                                }}
                                style={{ cursor: "pointer" }}
                            />
                        ))}
                    </Bar>

                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}