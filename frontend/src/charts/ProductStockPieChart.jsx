import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer
} from "recharts";

const COLORS = [
    "#6366f1",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6"
];

export default function ProductStockPieChart({ data }) {

    if (!data || data.length === 0) {
        return <p className="empty-text">No data</p>;
    }

    // ✅ Only for pie
    const chartData = data.filter(item => item.available_qty > 0);

    const total = chartData.reduce(
        (sum, item) => sum + item.available_qty,
        0
    );

    const renderLabel = ({ percent }) =>
        `${(percent * 100).toFixed(0)}%`;

    return (
        <div className="pie-layout">

            {/* ================= LEFT → PIE ================= */}
            <div className="pie-chart">
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>

                        {/* 🔥 Gradients */}
                        <defs>
                            {chartData.map((_, index) => (
                                <linearGradient
                                    key={index}
                                    id={`prodGrad-${index}`}
                                    x1="0"
                                    y1="0"
                                    x2="1"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor={COLORS[index % COLORS.length]}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="white"
                                        stopOpacity={0.3}
                                    />
                                </linearGradient>
                            ))}
                        </defs>

                        <Pie
                            data={chartData}
                            dataKey="available_qty"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={100}
                            label={chartData.length > 1 ? renderLabel : false}
                            animationDuration={1000}
                        >
                            {chartData.map((_, index) => (
                                <Cell
                                    key={index}
                                    fill={`url(#prodGrad-${index})`}
                                    stroke="#fff"
                                    strokeWidth={1}
                                />
                            ))}
                        </Pie>

                        {/* ✅ CENTER TEXT */}
                        <text
                            x="50%"
                            y="48%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="pie-center-text"
                        >
                            {total}
                        </text>

                        <text
                            x="50%"
                            y="58%"
                            textAnchor="middle"
                            className="pie-center-subtext"
                        >
                            Total Stock
                        </text>

                        <Tooltip content={<CustomTooltip />} />

                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* ================= RIGHT → LEGEND ================= */}
            <div className="pie-legend">
                {data.map((item, index) => {
                    const isZero = item.available_qty === 0;

                    const percent = total > 0
                        ? ((item.available_qty / total) * 100)
                        : 0;

                    return (
                        <div key={index} className="legend-item-vertical">

                            {/* Top → Color + Name */}
                            <div className="legend-top">
                                {!isZero && (
                                    <span
                                        className="legend-color"
                                        style={{
                                            "--target-width": `${percent}%`,
                                            background: COLORS[index % COLORS.length]
                                        }}
                                    />
                                )}
                                <span className="legend-name">
                                    {item.name}
                                </span>
                            </div>

                            {/* Value */}
                            <div className="legend-value">
                                ₹ {item.available_qty}
                            </div>

                            {/* Percentage */}
                            {!isZero && (
                                <div className="legend-percent">
                                    {percent.toFixed(1)}%
                                </div>
                            )}

                            {/* 🔥 Animated Bar */}
                            {!isZero && (
                                <div className="legend-bar-bg">
                                    <div
                                        className="legend-bar-fill"
                                        style={{
                                            "--target-width": `${percent}%`,
                                            background: COLORS[index % COLORS.length]
                                        }}
                                    />
                                </div>
                            )}

                        </div>
                    );
                })}
            </div>

        </div>
    );
}

/* ================= TOOLTIP ================= */
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="tooltip-box-premium">
                <p className="tooltip-title">
                    {payload[0].name}
                </p>
                <p className="tooltip-value">
                    {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};