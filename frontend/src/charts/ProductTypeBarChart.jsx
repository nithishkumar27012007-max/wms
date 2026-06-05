import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList
} from "recharts";

/* ============================= */
/* ICON + LABEL */
/* ============================= */
const TYPE_META = {
  RM: { icon: "🧱", label: "Raw Materials" },
  FG: { icon: "📦", label: "Finished Goods" },
  TI: { icon: "🛒", label: "Trading Items" }
};

/* ============================= */
/* Y AXIS */
/* ============================= */
const CustomYAxisTick = ({ x, y, payload }) => {
  const meta = TYPE_META[payload.value] || {};

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-10} y={0} dy={4} textAnchor="end" fill="#555" fontSize={13}>
        {meta.icon} {payload.value}
      </text>
    </g>
  );
};

/* ============================= */
/* TOOLTIP */
/* ============================= */
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const type = payload[0].payload.type;
    const meta = TYPE_META[type] || {};

    return (
      <div className="tooltip-box-premium">
        <p className="tooltip-title">
          {meta.icon} {type}
        </p>
        <p className="tooltip-sub">{meta.label}</p>
        <p className="tooltip-value">
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

/* ============================= */
/* VALUE LABEL INSIDE BAR */
/* ============================= */
const renderValueLabel = (props) => {
  const { x, y, width, height, value } = props;

  return (
    <text
      x={x + width - 10}
      y={y + height / 2}
      fill="#fff"
      fontSize={12}
      textAnchor="end"
      dominantBaseline="middle"
    >
      {value}
    </text>
  );
};

/* ============================= */
/* MAIN */
/* ============================= */
export default function ProductTypeBarChart({ data }) {

  if (!data || data.length === 0) {
    return <p className="empty-text">No data</p>;
  }

  return (
    <div className="premium-chart ultra">

      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 20, bottom: 30 }}
        >

          {/* 🌈 GRADIENTS */}
          <defs>
            <linearGradient id="rmGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fde68a"/>
              <stop offset="100%" stopColor="#f59e0b"/>
            </linearGradient>

            <linearGradient id="fgGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6ee7b7"/>
              <stop offset="100%" stopColor="#10b981"/>
            </linearGradient>

            <linearGradient id="tiGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#93c5fd"/>
              <stop offset="100%" stopColor="#3b82f6"/>
            </linearGradient>
          </defs>

          {/* GRID */}
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="#e5e7eb"
            vertical={false}
          />

          {/* AXIS */}
          <XAxis
            type="number"
            tick={{ fill: "#888", fontSize: 12 }}
          />

          <YAxis
            dataKey="type"
            type="category"
            tick={<CustomYAxisTick />}
          />

          {/* TOOLTIP */}
          <Tooltip content={<CustomTooltip />} />

          {/* 🔥 BAR */}
          <Bar
            dataKey="value"
            radius={[0, 14, 14, 0]}
            animationDuration={1400}
          >
            {data.map((entry, index) => {
              let gradientId = "tiGradient";
              if (entry.type === "RM") gradientId = "rmGradient";
              if (entry.type === "FG") gradientId = "fgGradient";

              return (
                <Cell key={index} fill={`url(#${gradientId})`} />
              );
            })}

            {/* 💡 VALUE LABEL */}
            <LabelList content={renderValueLabel} />
          </Bar>

        </BarChart>
      </ResponsiveContainer>

    </div>
  );
}