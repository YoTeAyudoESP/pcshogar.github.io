import React, { useState } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import type { Account } from '../../types/finance';
import { ArrowRightLeft } from 'lucide-react';

interface TransferFormProps {
    onClose: () => void;
}

const TransferForm: React.FC<TransferFormProps> = ({ onClose }) => {
    const { accounts, transferMoney } = useFinance();

    const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
    const [toAccountId, setToAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '');
    const [amount, setAmount] = useState<number>(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromAccountId || !toAccountId || amount <= 0) {
            alert('Por favor, completa todos los campos correctamente.');
            return;
        }
        if (fromAccountId === toAccountId) {
            alert('La cuenta de origen y destino no pueden ser la misma.');
            return;
        }

        setLoading(true);
        try {
            await transferMoney(fromAccountId, toAccountId, amount, new Date(date).getTime(), notes);
            onClose();
        } catch (error) {
            console.error("Transfer failed", error);
            alert('Error al realizar el traspaso.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowRightLeft size={20} />
                    Traspaso entre Cuentas
                </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                        Cuenta Origen
                    </label>
                    <select
                        value={fromAccountId}
                        onChange={(e) => setFromAccountId(e.target.value)}
                        className="form-input"
                        required
                        style={{ width: '100%' }}
                    >
                        {accounts.map((acc: Account) => (
                            <option key={acc.id} value={acc.id}>
                                {acc.type === 'cash' ? '💵' : '🏦'} {acc.name} ({acc.balance.toFixed(2)}€)
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                        Cuenta Destino
                    </label>
                    <select
                        value={toAccountId}
                        onChange={(e) => setToAccountId(e.target.value)}
                        className="form-input"
                        required
                        style={{ width: '100%' }}
                    >
                        {accounts.map((acc: Account) => (
                            <option key={acc.id} value={acc.id}>
                                {acc.type === 'cash' ? '💵' : '🏦'} {acc.name} ({acc.balance.toFixed(2)}€)
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                        Importe
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={amount || ''}
                        onChange={(e) => setAmount(parseFloat(e.target.value))}
                        className="form-input"
                        placeholder="0.00"
                        required
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                        Fecha
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="form-input"
                        required
                        style={{ width: '100%' }}
                    />
                </div>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Notas (opcional)
                </label>
                <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="form-input"
                    placeholder="Ej: Traspaso a ahorros"
                    style={{ width: '100%' }}
                />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ flex: 2, background: 'var(--color-secondary)' }}
                >
                    {loading ? 'Procesando...' : 'Confirmar Traspaso'}
                </button>
            </div>
        </form>
    );
};

export default TransferForm;
