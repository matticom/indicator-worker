import { INITIAL_MONEY } from '../constants';

export function getXDayLineData(days, data, tolerance) {
   const xDayLine = data.map((dayData, idx) => {
      if (idx >= days) {
         const sectionXdays = data.slice(idx - days, idx);

         const sumXdays = sectionXdays.reduce((sum, curr) => (sum += curr), 0);
         return sumXdays / days;
      } else {
         return dayData;
      }
   });

   const xDayLineMinus = xDayLine.map((value) => {
      return value - (value / 100) * tolerance;
   });

   const xDayLinePlus = xDayLine.map((value) => {
      return value + (value / 100) * tolerance;
   });
   return { xDayLine, plusLimit: xDayLinePlus, minusLimit: xDayLineMinus };
}

export function calcProfit(days, unixLabels, lineData, lineDataMinus, lineDataPlus) {
   const stepAnnotations = [];
   let pieces = 0;
   let currentMoney = INITIAL_MONEY;
   let transactionCount = 0;

   let lastSoldDiff = 0;
   let lastBuyDiff = 0;
   let counter = 0;
   let lastAction = 'sold';

   let lastSold = { savings: INITIAL_MONEY, date: unixLabels[0] };
   let currentState = { lastAction: '', lastActionDate: '', price: 0 };

   for (let index = days; index < lineData.length; index++) {
      const price = lineData[index];
      const unixLabel = unixLabels[index];
      const priceMinusTolerance = lineDataMinus[index];
      const pricePlusTolerance = lineDataPlus[index];
      const currentSoldDiff = price - priceMinusTolerance;
      const currentBuyDiff = price - pricePlusTolerance;

      if (lastAction === 'sold' && lastBuyDiff <= 0 && currentBuyDiff > 0) {
         stepAnnotations.push({ unixLabel, action: 'Buy', color: '#6610f2', counter });
         lastSoldDiff = currentSoldDiff;
         lastBuyDiff = currentBuyDiff;
         lastAction = 'buy';

         pieces = currentMoney / price;
         currentMoney = 0;
         transactionCount++;
         currentState = { ...currentState, lastAction, lastActionDate: unixLabel };
         // console.log(`BUY :>> ${label} (pieces: ${pieces} / price: ${price})`);
      }
      // console.log('lastSoldDiff :>> ', lastSoldDiff);
      // console.log('currentSoldDiff :>> ', currentSoldDiff);

      if (lastAction === 'buy' && lastSoldDiff > 0 && currentSoldDiff <= 0) {
         stepAnnotations.push({ unixLabel, action: 'Sold', color: '#4dbd74', counter });
         lastSoldDiff = currentSoldDiff;
         lastBuyDiff = currentBuyDiff;
         lastAction = 'sold';

         currentMoney = price * pieces;
         pieces = 0;
         // console.log(`SOLD :>> ${label} (savings: ${currentMoney} / price: ${price})`);
         transactionCount++;
         lastSold = { savings: currentMoney, transactions: transactionCount };
         currentState = { ...currentState, lastAction, lastActionDate: unixLabel };
      }
      currentState = { ...currentState, price };
      counter++;
   }
   return { lastSold, currentState, stepAnnotations };
}
