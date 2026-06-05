import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer
} from "recharts";

const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4"
];

export default function WarehouseValuePieChart({ data }) {

    if (!data || data.length === 0) {
        return <p className="empty-text">No data</p>;
    }

    // ✅ remove zero values
    const chartData = data.filter(item => item.value > 0);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    // ✅ percentage label
    const renderLabel = ({ percent }) => {
        return `${(percent * 100).toFixed(0)}%`;
    };

    return (
        <div className="pie-layout">

            {/* LEFT → PIE */}
            <div className="pie-chart">
                <ResponsiveContainer width="100%" height={260}>
                    <PieChart>

                        {/* 🔥 GRADIENT DEFINITIONS */}
                        <defs>
                            {chartData.map((entry, index) => (
                                <linearGradient
                                    key={index}
                                    id={`grad-${index}`}
                                    x1="0"
                                    y1="0"
                                    x2="1"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor={COLORS[index % COLORS.length]}
                                        stopOpacity={1}
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor={COLORS[index % COLORS.length]}
                                        stopOpacity={0.4}
                                    />
                                </linearGradient>
                            ))}
                        </defs>

                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="warehouse_id"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}   // ✅ donut style
                            outerRadius={100}
                            label={renderLabel}
                            animationDuration={1200}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={`url(#grad-${index})`}
                                    stroke="#fff"
                                    strokeWidth={1}
                                    style={{
                                        filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.15))"
                                    }}
                                />
                            ))}
                        </Pie>

                        {/* ✅ CENTER TOTAL */}
                        <text
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="pie-center-text"
                        >
                            ₹ {total.toLocaleString()}
                        </text>

                        <text x="50%" y="58%" textAnchor="middle" className="pie-center-subtext">
                            Total Value
                        </text>

                        <Tooltip content={<CustomTooltip />} />

                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* RIGHT → LEGEND */}
            <div className="pie-legend">
                {chartData.map((item, index) => {
                    const percent = ((item.value / total) * 100).toFixed(1);

                    return (
                        <div key={index} className="legend-item">
                            <span
                                className="legend-color"
                                style={{
                                    background: `linear-gradient(135deg, ${COLORS[index % COLORS.length]}, rgba(255,255,255,0.4))`
                                }}
                            />
                            <div>
                                <p className="legend-name">{item.warehouse_id}</p>
                                <p className="legend-value">
                                    ₹ {item.value.toLocaleString()} ({percent}%)
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}

/* 🔥 TOOLTIP */
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="tooltip-box-premium">
                <p className="tooltip-title">
                    {payload[0].name}
                </p>
                <p className="tooltip-value">
                    ₹ {payload[0].value.toLocaleString()}
                </p>
            </div>
        );
    }
    return null;
};