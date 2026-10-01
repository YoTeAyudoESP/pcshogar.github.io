const fs = require('fs');
const path = require('path');

const JSON_PATH = 'C:\\Users\\pablo\\Downloads\\pcshogar_backup_2026-10-01.json';

try {
  const rawData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

  console.log('=== USER BACKUP DATA AUDIT ===');
  for (const [storeName, items] of Object.entries(rawData)) {
    if (Array.isArray(items)) {
      console.log(`Store '${storeName}': ${items.length} items`);
    } else {
      console.log(`Store '${storeName}': ${typeof items}`);
    }
  }

  console.log('\n=== INCOMES DETAILS ===');
  if (Array.isArray(rawData.incomes)) {
    rawData.incomes.forEach((inc, idx) => {
      console.log(`[${idx}] name: "${inc.name}" | type: "${inc.type}" | amount: ${inc.amount} | budgetMonth: ${inc.budgetMonth} | budgetYear: ${inc.budgetYear} | status: "${inc.status}"`);
    });
  }

  console.log('\n=== RECURRING EXPENSES DETAILS ===');
  if (Array.isArray(rawData.recurring_expenses)) {
    rawData.recurring_expenses.forEach((re, idx) => {
      console.log(`[${idx}] desc: "${re.description}" | amount: ${re.amount} | frequency: "${re.frequency}" | active: ${re.active}`);
    });
  }

  console.log('\n=== SAVINGS GOALS DETAILS ===');
  if (Array.isArray(rawData.savings)) {
    rawData.savings.forEach((s, idx) => {
      console.log(`[${idx}] name: "${s.name}" | currentAmount: ${s.currentAmount} | accountInBudget: ${s.accountInBudget}`);
    });
  }

} catch (e) {
  console.error(e);
}
