export default function PageHeader({ title, breadcrumbs = [] }) {
    return (
        <div className="page-header">
            {breadcrumbs.length > 0 && (
                <nav>
                    {breadcrumbs.map((idx) => (
                        <span key={idx}>
                        </span>
                    ))}
                </nav>
            )}
            <h1 className="page-title" style={{ marginTop: "-30px" }}>{title}</h1>
        </div>
    );
}
