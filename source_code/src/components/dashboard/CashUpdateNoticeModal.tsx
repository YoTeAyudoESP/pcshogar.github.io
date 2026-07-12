import React, { useState, useEffect } from 'react';
import { useFinance } from '../../contexts/FinanceContext';
import { Wallet, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface CashUpdateNoticeModalProps {
    onClose: () => void;
}

const CashUpdateNoticeModal: React.FC<CashUpdateNoticeModalProps> = ({ onClose }) => {
    const { expenses, accounts, addAccount, updateExpense } = useFinance();
    const [step, setStep] = useState(0);
    const [orphanedCount, setOrphanedCount] = useState(0);
    const [orphanedSum, setOrphanedSum] = useState(0);
    const [selectedWalletId, setSelectedWalletId] = useState('');
    const [newWalletName, setNewWalletName] = useState('Mi Cartera');
    const [newWalletBalance, setNewWalletBalance] = useState('');
    const [migrating, setMigrating] = useState(false);

    const cashWallets = accounts.filter(a => a.type === 'cash');

    useEffect(() => {
        const orphaned = expenses.filter(e => 
            e.paymentMethod.type === 'cash' && 
            !(e.paymentMethod as any).accountId &&
            e.status === 'paid'
        );

        setOrphanedCount(orphaned.length);
        setOrphanedSum(orphaned.reduce((sum, e) => sum + e.amount, 0));
        
        if (orphaned.length === 0) {
            setStep(0); // Only informational
        } else if (cashWallets.length === 1) {
            setStep(1); // Auto migration ready
        } else if (cashWallets.length > 1) {
            setStep(2); // Manual selection
        } else {
            setStep(3); // Zero wallets, create one
        }
    }, [expenses, accounts]);

    const handleAcknowledge = () => {
        localStorage.setItem('cashUpdateNoticeSeen', 'true');
        onClose();
    };

    const runMigration = async (targetAccountId: string) => {
        setMigrating(true);
        const orphaned = expenses.filter(e => 
            e.paymentMethod.type === 'cash' && 
            !(e.paymentMethod as any).accountId &&
            e.status === 'paid'
        );

        for (const exp of orphaned) {
            const updated = {
                ...exp,
                paymentMethod: { type: 'cash' as const, accountId: targetAccountId }
            };
            await updateExpense(updated);
        }
        
        setMigrating(false);
        handleAcknowledge();
    };

    const handleCreateWalletAndMigrate = async () => {
        if (!newWalletName.trim() || !newWalletBalance) return;
        setMigrating(true);
        
        const currentRealBalance = parseFloat(newWalletBalance);
        // We offset the balance because db.updateExpense will subtract the expenses
        const offsetBalance = currentRealBalance + orphanedSum;

        try {
            await addAccount(newWalletName, 'cash', offsetBalance);
            // We need to wait for the account to be created to get its ID, 
            // but addAccount does not return the ID or the account object.
            // However, db.ts addAccount saves it.
            // Let's just reload or manually fetch from indexeddb to find the latest cash account.
            // Actually, we can just use a unique name and fetch it.
        } catch (err) {
            console.error(err);
        }
    };

    // Since addAccount doesn't return ID, we can do a hack: we use addAccount, then wait 500ms, then run migration on the newest cash wallet.
    const executeWalletCreation = async () => {
        if (!newWalletName.trim() || !newWalletBalance) return;
        setMigrating(true);
        const currentRealBalance = parseFloat(newWalletBalance);
        const offsetBalance = currentRealBalance + orphanedSum;
        
        await addAccount(newWalletName, 'cash', offsetBalance);
        
        setTimeout(() => {
            // we will just reload the page and let the modal step 1 handle the auto-migration next time!
            // Wait, if we reload the page, cashWallets.length === 1, so it will go to step 1!
            // That's brilliant and safe.
            window.location.reload();
        }, 1000);
    }

    const containerStyle: React.CSSProperties = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    };

    const modalStyle: React.CSSProperties = {
        background: '#1e1e2d', width: '100%', maxWidth: '500px',
        borderRadius: '1rem', padding: '2rem', color: 'white',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
    };

    const buttonStyle: React.CSSProperties = {
        background: 'var(--color-primary)', color: 'white', border: 'none',
        padding: '1rem', borderRadius: '0.5rem', width: '100%',
        fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', marginTop: '1.5rem'
    };

    if (migrating) {
        return (
            <div style={containerStyle}>
                <div style={{...modalStyle, textAlign: 'center'}}>
                    <h2>Procesando...</h2>
                    <p style={{color: 'rgba(255,255,255,0.7)'}}>Actualizando tus gastos y carteras, por favor espera.</p>
                </div>
            </div>
        );
    }

    if (step === 0) {
        return (
            <div style={containerStyle}>
                <div style={modalStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
                        <Wallet size={32} />
                        <h2 style={{ margin: 0 }}>Mejora en Efectivo</h2>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                        Hemos mejorado la forma en que la app maneja los pagos en "Efectivo". A partir de ahora, todos los gastos en efectivo deberán estar vinculados a una de tus "Carteras de Efectivo" configuradas en los Ajustes.
                    </p>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem' }}>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={18} />
                            <strong>Importante</strong>
                        </p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                            Te recomendamos encarecidamente que vayas a Ajustes y revises el saldo de tu(s) cartera(s) de efectivo para asegurarte de que coincide con la realidad de tu bolsillo.
                        </p>
                    </div>
                    <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                        Si tienes dudas, contáctanos en contacto@pcshogar.com
                    </p>
                    <button onClick={handleAcknowledge} style={buttonStyle}>Entendido</button>
                </div>
            </div>
        );
    }

    // Auto migrate 1 wallet
    if (step === 1) {
        return (
            <div style={containerStyle}>
                <div style={modalStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: '#10b981' }}>
                        <CheckCircle size={32} />
                        <h2 style={{ margin: 0 }}>Actualizando tu Efectivo</h2>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                        Hemos mejorado la gestión del Efectivo. Hemos detectado {orphanedCount} gastos antiguos que no estaban vinculados a ninguna cartera.
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginTop: '1rem' }}>
                        Como solo tienes una Cartera de Efectivo ("{cashWallets[0].name}"), vamos a asignarlos automáticamente y se descontará el total de tu saldo virtual para que la contabilidad sea perfecta.
                    </p>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem' }}>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={18} />
                            <strong>Atención</strong>
                        </p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                            Tras pulsar en "Actualizar", por favor ve a Ajustes y revisa que el saldo de tu cartera coincida con la realidad, y ajústalo si es necesario.
                        </p>
                    </div>
                    <button onClick={() => runMigration(cashWallets[0].id)} style={{...buttonStyle, background: '#10b981'}}>
                        Actualizar Ahora
                    </button>
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div style={containerStyle}>
                <div style={modalStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: '#fbbf24' }}>
                        <Info size={32} />
                        <h2 style={{ margin: 0 }}>Vincula tus Gastos</h2>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                        Tienes {orphanedCount} gastos antiguos en efectivo sueltos y múltiples carteras. ¿De qué cartera salió ese dinero?
                    </p>
                    <select 
                        value={selectedWalletId} 
                        onChange={e => setSelectedWalletId(e.target.value)}
                        style={{ width: '100%', padding: '1rem', marginTop: '1rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <option value="">Selecciona una cartera...</option>
                        {cashWallets.map(w => (
                            <option key={w.id} value={w.id}>{w.name} (Saldo actual: {w.balance}€)</option>
                        ))}
                    </select>
                    <button 
                        onClick={() => runMigration(selectedWalletId)} 
                        style={{...buttonStyle, opacity: selectedWalletId ? 1 : 0.5}}
                        disabled={!selectedWalletId}
                    >
                        Vincular y Actualizar
                    </button>
                </div>
            </div>
        );
    }

    // Step 3: Zero wallets
    return (
        <div style={containerStyle}>
            <div style={modalStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: '#ef4444' }}>
                    <Wallet size={32} />
                    <h2 style={{ margin: 0 }}>Crea tu Cartera</h2>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                    Tienes {orphanedCount} gastos en efectivo antiguos, pero no tienes ninguna cartera creada en el sistema para descontarlos.
                </p>
                <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginTop: '1rem' }}>
                    Por favor, crea tu primera Cartera de Efectivo. Introduce el dinero <strong>real que tienes ahora mismo</strong> físicamente. Los gastos antiguos se vincularán a ella pero NO te restarán de este saldo inicial.
                </p>
                
                <div style={{ marginTop: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Nombre de la Cartera</label>
                    <input 
                        type="text" 
                        value={newWalletName} 
                        onChange={e => setNewWalletName(e.target.value)}
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem', outline: 'none' }}
                    />
                    
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Saldo Real Actual (€)</label>
                    <input 
                        type="number" 
                        step="0.01"
                        value={newWalletBalance} 
                        onChange={e => setNewWalletBalance(e.target.value)}
                        placeholder="Ej: 50.00"
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                    />
                </div>
                
                <button 
                    onClick={executeWalletCreation} 
                    style={{...buttonStyle, background: '#ef4444', opacity: (newWalletName && newWalletBalance) ? 1 : 0.5}}
                    disabled={!newWalletName || !newWalletBalance}
                >
                    Crear y Continuar
                </button>
            </div>
        </div>
    );
};

export default CashUpdateNoticeModal;
