import React from 'react';
import { useDateSelection } from '../../contexts/DateSelectionContext';

const DateSelector: React.FC = () => {
    const { selectedMonth, selectedYear, prevMonth, nextMonth, prevYear, nextYear } = useDateSelection();

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return (
        <div className="glass-panel" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            background: 'var(--bg-surface-elevated)',
            border: 'var(--card-border)'
        }}>
            {/* Year Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={prevYear} className="btn-icon">«</button>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{selectedYear}</div>
                <button onClick={nextYear} className="btn-icon">»</button>
            </div>

            {/* Month Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={prevMonth} className="btn-icon">‹</button>
                <div style={{
                    minWidth: '100px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}>
                    {monthNames[selectedMonth]}
                </div>
                <button onClick={nextMonth} className="btn-icon">›</button>
            </div>

            <style>{`
                .btn-icon {
                    background: var(--btn-ghost-bg);
                    border: var(--card-border);
                    color: var(--text-main);
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    transition: all 0.2s;
                }
                .btn-icon:hover {
                    background: var(--bg-surface);
                    color: var(--color-primary);
                    transform: scale(1.1);
                }
            `}</style>
        </div>
    );
};

export default DateSelector;
