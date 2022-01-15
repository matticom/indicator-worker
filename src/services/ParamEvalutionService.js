import {
   MIN_TOLERANCE,
   MAX_DAYS,
   MIN_DAYS,
   MAX_TRANSACTIONS_PER_YEAR,
   MAX_TOLERANCE,
   INITIAL_MONEY,
} from '../constants';

import { calcProfit, getXDayLineData } from './BasicService';

export function evaluateParams(rawData, start, end) {
   let sourceData = rawData;
   if (start !== undefined) {
      if (end !== undefined) {
         sourceData = rawData.filter((data) => data.date >= start && data.date <= end);
      } else {
         end = rawData[rawData.length - 1].date;
         sourceData = rawData.filter((data) => data.date >= start);
      }
   }
   // Transaction max value
   const timeRangeInDays = start !== undefined && end !== undefined ? (end - start) / 3600 / 24 : rawData.length;
   const maxTransactionsPerDay = MAX_TRANSACTIONS_PER_YEAR / 365; // 12 transaction/year
   const maxTransactions = timeRangeInDays * maxTransactionsPerDay;

   const unixLabels = sourceData.map((dayData) => dayData.date);
   const data = sourceData.map((dayData) => dayData.value);

   const result = [];
   const top10 = [];

   const daysParams = [];
   for (let days = MIN_DAYS; days <= MAX_DAYS; days++) {
      daysParams.push(days);
   }

   const toleranceParams = [];
   for (let tolerance = MIN_TOLERANCE; tolerance <= MAX_TOLERANCE; tolerance++) {
      toleranceParams.push(tolerance);
   }

   daysParams.forEach((daysParam) => {
      const tolerancesRes = [];
      toleranceParams.forEach((toleranceParam) => {
         const {
            xDayLine: lineX,
            plusLimit: lineXPlus,
            minusLimit: lineXMinus,
         } = getXDayLineData(daysParam, data, toleranceParam);
         const { lastSold, currentState } = calcProfit(daysParam, unixLabels, data, lineXMinus, lineXPlus);
         const { savings, date, transactions } = lastSold; // issue with raise at the beginning due to only BUY signal but no sell --> no param for gain fn

         // transaction filter application
         tolerancesRes.push(transactions > maxTransactions && sourceData.length > 60 ? INITIAL_MONEY : savings); // issues with short terms
         // tolerancesRes.push(transactions > maxTransactions ? INITIAL_MONEY : savings);
         top10.push({ savings, days: daysParam, tolerance: toleranceParam, transactions, currentState });
      });
      result.push(tolerancesRes);
   });
   // console.log('top10 :>> ', top10);

   let filteredTop10 = top10.filter((entry) => entry.transactions < maxTransactions);
   // console.log('filteredTop10 :>> ', filteredTop10);
   filteredTop10.sort((a, b) => b.savings - a.savings);
   filteredTop10 = filteredTop10.slice(0, 25);
   // console.log('top25 :>> ', filteredTop10);

   return { chart3dData: result, topX: filteredTop10, data, unixLabels };
   // console.log('result :>> ', result);
}
