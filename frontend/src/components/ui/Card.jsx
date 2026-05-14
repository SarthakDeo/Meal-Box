import './Card.css';

export default function Card({ children, className = '', variant = 'default', animate = true, ...props }) {
  return (
    <div
      className={`card card--${variant} ${animate ? 'animate-fade-in-up' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({ icon, label, value, sub, trend, color = 'primary' }) {
  return (
    <div className={`stat-card stat-card--${color} animate-fade-in-up`}>
      <div className="stat-card__icon-wrap">
        {icon}
      </div>
      <div className="stat-card__info">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value}</span>
        {sub && <span className="stat-card__sub">{sub}</span>}
      </div>
      {trend !== undefined && (
        <span className={`stat-card__trend ${trend >= 0 ? 'stat-card__trend--up' : 'stat-card__trend--down'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
}
