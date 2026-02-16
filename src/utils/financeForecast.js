import { 
    startOfMonth, 
    endOfMonth, 
    addMonths, 
    addWeeks, 
    addYears, 
    addDays,
    isAfter, 
    format 
} from 'date-fns';

export const getStrictLocalNoon = (dateInput) => {
    if (!dateInput) return new Date();
    const dateString = dateInput instanceof Date ? format(dateInput, 'yyyy-MM-dd') : String(dateInput);
    const parts = dateString.substring(0, 10).split('-');
    if (parts.length !== 3) return new Date();
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
};

const parseAmount = (val) => {
    if (!val) return 0;
    const clean = String(val).replace(/,/g, '');
    return parseFloat(clean) || 0;
};

export const calculateMonthlyProjection = (transactions, targetDate, categoryTypeMap = {}) => {
    const monthStartStr = format(targetDate, 'yyyy-MM');
    const monthStart = getStrictLocalNoon(startOfMonth(targetDate));
    const monthEnd = getStrictLocalNoon(endOfMonth(targetDate));

    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryTotals = {};
    const occurrences = [];

    // STEP A: Gather Physical Items for this month
    transactions.forEach(t => {
        if (t.date && t.date.substring(0, 7) === monthStartStr) {
            const isRec = t.isRecurring === true || t.isRecurring === 'true' || t.isRecurring === 1;
            if (isRec || t.recurringId) {
                occurrences.push({ ...t, isGhost: false });
            }
        }
    });

    // STEP B: Project future "Ghosts" for Masters
    const masters = transactions.filter(t => {
        return t.isRecurring === true || t.isRecurring === 'true' || t.isRecurring === 1;
    });
    
    masters.forEach(master => {
        const isPaused = master.isPaused === true || master.isPaused === 'true' || master.isPaused === 1;
        if (isPaused) return;

        const mDate = getStrictLocalNoon(master.date);
        const endDate = master.endDate ? getStrictLocalNoon(master.endDate) : null;
        let freq = (master.frequency || 'monthly').toLowerCase();
        if (freq === 'byweekly' || freq === 'bi-weekly') freq = 'biweekly';
        
        if (isAfter(mDate, monthEnd)) return;

        let baseDate = new Date(mDate);
        let isSecondOccurrence = false; // Tracks the 2nd paycheck of the month
        let safety = 0;

        while (baseDate <= monthEnd && safety < 2000) {
            safety++;
            
            // Calculate actual date for this specific occurrence
            let currentIterDate = new Date(baseDate);
            if (freq === 'biweekly' && isSecondOccurrence) {
                currentIterDate = addDays(baseDate, 14);
            }
            
            if (endDate && isAfter(currentIterDate, endDate)) break;

            if (currentIterDate >= monthStart && currentIterDate <= monthEnd) {
                const dateStr = format(currentIterDate, 'yyyy-MM-dd');
                
                const isCovered = occurrences.some(o => {
                    const isFamily = o.id === master.id || o.recurringId === master.id || (o.recurringId && o.recurringId === master.recurringId);
                    return isFamily && o.date.substring(0, 10) === dateStr;
                });

                if (!isCovered) {
                    occurrences.push({
                        ...master,
                        date: dateStr,
                        isGhost: true
                    });
                }
            }

            // STEP FORWARD
            if (freq === 'monthly') {
                baseDate = addMonths(baseDate, 1);
            } else if (freq === 'weekly') {
                baseDate = addWeeks(baseDate, 1);
            } else if (freq === 'biweekly') {
                // SEMI-MONTHLY LOGIC: 2 times a month, then jump to next month
                if (isSecondOccurrence) {
                    baseDate = addMonths(baseDate, 1);
                    isSecondOccurrence = false;
                } else {
                    isSecondOccurrence = true;
                }
            } else if (freq === 'yearly') {
                baseDate = addYears(baseDate, 1);
            } else break; 
        }
    });

    // STEP C: Sum up the occurrences
    occurrences.forEach(occ => {
        const amount = parseAmount(occ.amount);
        if (amount === 0) return;

        const catName = occ.category || 'Uncategorized';
        const catKey = catName.toLowerCase();
        
        const resolvedType = (categoryTypeMap[catKey] || occ.type || 'expense').toLowerCase();
        
        if (resolvedType === 'income') {
            totalIncome += amount;
        } else if (resolvedType === 'expense') {
            totalExpenses += amount;
            categoryTotals[catName] = (categoryTotals[catName] || 0) + amount;
        }
    });

    return { totalIncome, totalExpenses, categoryTotals };
};