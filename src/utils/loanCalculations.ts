import type { Loan } from '../types/finance';

/**
 * Cálculos para préstamos (Sistema Francés)
 */

export interface AmortizationRow {
    month: number;
    date: number; // timestamp
    installment: number; // Cuota a pagar
    principalPayment: number; // Parte de capital (amortización)
    interestPayment: number; // Parte de intereses
    remainingPrincipal: number; // Capital vivo pendiente
}

export const LoanCalculations = {
    /**
     * Calcula la cuota mensual usando el sistema francés (cuota constante).
     * @param principal Capital prestado inicial
     * @param tin Tipo de interés nominal (en porcentaje, ej. 5 para 5%)
     * @param months Plazo en meses
     */
    calculateMonthlyInstallment(principal: number, tin: number, months: number): number {
        if (tin === 0 || months === 0) {
            return months > 0 ? principal / months : 0;
        }
        const r = (tin / 100) / 12; // Tasa mensual
        const installment = principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
        return installment;
    },

    /**
     * Genera el cuadro de amortización completo de un préstamo.
     */
    generateAmortizationSchedule(loan: Loan): AmortizationRow[] {
        const schedule: AmortizationRow[] = [];
        const principal = loan.totalAmount;
        
        // Si no es un préstamo avanzado o no tiene TIN, devolver vacío (o generar uno lineal básico)
        if (loan.mode !== 'advanced' || loan.tin === undefined || loan.estimatedEndDate === undefined) {
            return schedule;
        }

        const start = new Date(loan.startDate);
        const end = new Date(loan.estimatedEndDate);
        
        let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (months <= 0) months = 1;

        const tin = loan.tin || 0;
        const r = (tin / 100) / 12;
        
        let installment = this.calculateMonthlyInstallment(principal, tin, months);
        
        let currentPrincipal = principal;
        let currentDate = new Date(start);

        for (let i = 1; i <= months; i++) {
            currentDate.setMonth(currentDate.getMonth() + 1);
            
            // Ajustar última cuota
            let actualInstallment = installment;
            
            let interest = currentPrincipal * r;
            let principalPayment = actualInstallment - interest;

            if (i === months || currentPrincipal < principalPayment) {
                principalPayment = currentPrincipal;
                actualInstallment = principalPayment + interest;
            }
            
            // Si el usuario fijó la primera cuota (diferente por ajuste de días)
            if (i === 1 && loan.firstInstallmentAmount !== undefined) {
                actualInstallment = loan.firstInstallmentAmount;
                principalPayment = actualInstallment - interest;
            }
            
            // Si el usuario fijó la última cuota (y estamos en el último mes)
            if (i === months && loan.lastInstallmentAmount !== undefined) {
                actualInstallment = loan.lastInstallmentAmount;
                principalPayment = actualInstallment - interest;
            }

            currentPrincipal -= principalPayment;
            if (currentPrincipal < 0) currentPrincipal = 0;

            schedule.push({
                month: i,
                date: currentDate.getTime(),
                installment: actualInstallment,
                principalPayment,
                interestPayment: interest,
                remainingPrincipal: currentPrincipal
            });
        }

        return schedule;
    },

    /**
     * Devuelve la deuda real en base a los meses transcurridos
     * @param loan 
     * @param targetDate Fecha para la que queremos saber la deuda (normalmente hoy)
     */
    getCurrentDebt(loan: Loan, targetDate: number = Date.now()): number {
        if (loan.mode !== 'advanced') {
            return loan.remainingAmount; // Comportamiento legacy
        }

        const schedule = this.generateAmortizationSchedule(loan);
        if (schedule.length === 0) return loan.remainingAmount;

        // Encontrar el último pago que se debería haber hecho antes o en la fecha objetivo
        const passedPayments = schedule.filter(row => row.date <= targetDate);
        
        if (passedPayments.length === 0) {
            return loan.totalAmount; // Aún no se ha hecho ningún pago
        }
        
        // Devolvemos el capital pendiente del último mes pagado
        return passedPayments[passedPayments.length - 1].remainingPrincipal;
    },

    /**
     * Calcula la comisión de amortización anticipada
     * @param amountToAmortize Cantidad de capital a reducir
     * @param feePercentage Porcentaje de comisión (ej. 1%)
     */
    calculateAmortizationFee(amountToAmortize: number, feePercentage: number = 0): number {
        return amountToAmortize * (feePercentage / 100);
    }
};
