import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#22c55e", "#ef4444", "#f7d21b"];

export default function WarehousePieChart({ data }) {

    if (!data) return null;

    const chartData = [
        { name: "Available", value: data.available || 0 },
        { name: "Occupied", value: data.occupied || 0 },
        { name: "Restricted", value: data.restricted || 0 },
    ];

    return (
        <div style={{ width: 260, height: 240 }}>
                <PieChart width={260} height={240}>
                    <Pie
                        data={chartData}
                        cx="50%"          // 👉 move right slightly
                        cy="50%"
                        outerRadius={90}  // 👉 bigger
                        innerRadius={0}  // 👉 donut style
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={index} fill={COLORS[index]} />
                        ))}
                    </Pie>

                    <Tooltip />
                </PieChart>
        </div>
    );
}