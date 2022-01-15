import moment from 'moment';
import { INITIAL_MONEY, SIMULATION } from '../constants';
import { recentlyDropped } from '../rules/hints';
import { afterBuyDropThresholdReached, peakDropReachedThreshold, waitAfterSpike } from '../rules/rules';
import { sendNotification } from '../services/CommunicationService';
import { evaluateParams } from '../services/ParamEvalutionService';
import { getNewDataSet, annotationTransform } from '../tools/ChartTools';
import { sleep } from '../tools/General';

let stopFlag = false;

export function stopSimulation() {
   stopFlag = true;
}

export async function simulate(start, end, simuCalcWindow, sourceData) {
   stopFlag = false;
   const beforeCalcStarted = 30;
   const rawData = sourceData.filter((data) => data.date >= start && data.date <= end);

   const data = rawData.map((dayData) => dayData.value);
   const labels = rawData.map((dayData) => moment.unix(dayData.date).format('D. MMM YYYY'));
   const chartData = { labels, datasets: [getNewDataSet(data, 'Currency')] };

   const startDate = rawData[beforeCalcStarted].date;

   let lastSavings = INITIAL_MONEY;
   let lastPieces = 0;
   let lastAction = '';
   let lastActionDate = startDate;
   const transactionList = [];
   const annotations = [];

   let waitedAfterSpike = false;

   let counter = 0;
   for (let index = beforeCalcStarted; index < rawData.length; index++) {
      if (stopFlag === true) {
         console.log(`Stop at ${index - beforeCalcStarted}/${rawData.length - beforeCalcStarted}`);
         sendNotification(SIMULATION, { type: 'stop' });
         return;
      }
      const secureWindow = simuCalcWindow ? (simuCalcWindow < index ? simuCalcWindow : index) : 0;
      const startOfCalc = simuCalcWindow ? rawData[index - secureWindow].date : 0;
      const endOfCalc = rawData[index].date;

      const dataToBeCalc = simuCalcWindow
         ? rawData.filter((data) => data.date >= startOfCalc && data.date <= endOfCalc)
         : rawData.filter((data) => data.date <= endOfCalc);
      const { topX } = evaluateParams([...dataToBeCalc]);
      const startLabel = dataToBeCalc[0].date;
      const currentLabel = endOfCalc;
      // console.log('\n\n>>>> new cycle :>> ', counter);
      // console.log('start Of cycle :>> ', startLabel);
      // console.log('end Of cycle :>> ', currentLabel);

      const result = topX.length === 0 ? 'nada' : topX[0];
      // console.log('result :>> ', result);

      sendNotification(SIMULATION, {
         type: 'cycle update basic',
         data: {
            counter,
            currentLoop: index - beforeCalcStarted,
            maxLoops: rawData.length - beforeCalcStarted,
            startLabel,
            currentLabel,
            result,
         },
      });

      if (
         topX.length === 0 ||
         (topX.length > 0 && topX[0].savings <= INITIAL_MONEY && topX[0].currentState.lastAction !== 'buy')
      ) {
         // console.log('start condition wrong :>> ', moment.unix(currentLabel).format('D. MMM YYYY'));
         continue;
      }

      let ruleApplied = false;
      let maxSavings = 0;
      let rule = '-';

      const { savings, days, tolerance, transactions, currentState } = topX[0];
      const calcLastActionDate = currentState.lastActionDate;
      const calcLastAction = currentState.lastAction;
      const currentPrice = currentState.price;
      const calcLabel = currentState.lastActionDate;
      // console.log('current Price :>> ', currentPrice);

      recentlyDropped(dataToBeCalc, index);

      if (lastAction === 'buy') {
         if (afterBuyDropThresholdReached(transactionList, currentPrice)) {
            ruleApplied = true;
            lastSavings = currentPrice * lastPieces;
            lastPieces = 0;
            annotations.push({ unixLabel: currentLabel, action: 'Sold (ABD)', color: '#4dbd74', counter });
            lastAction = 'sold';
            rule = 'ABD';
            lastActionDate = currentLabel;
         } else if (peakDropReachedThreshold(dataToBeCalc, index, transactionList)) {
            ruleApplied = true;
            lastSavings = currentPrice * lastPieces;
            lastPieces = 0;
            annotations.push({ unixLabel: currentLabel, action: 'Sold (PD)', color: '#4dbd74', counter });
            lastAction = 'sold';
            rule = 'PD';
            lastActionDate = currentLabel;
         }
      }

      if (!ruleApplied) {
         if (calcLastActionDate <= startDate || calcLastActionDate <= lastActionDate) {
            // console.log(
            //    `date does not fit (now:${moment.unix(currentLabel).format('D. MMM YYYY')}):>> `,
            //    moment.unix(calcLastActionDate).format('D. MMM YYYY'),
            // );
            continue;
         }

         if (lastAction === 'sold' || lastAction === '') {
            if (calcLastAction === 'buy') {
               // if (waitAfterSpike(dataToBeCalc, index)) {
               //    waitedAfterSpike = true;
               //    continue;
               // }
               // if (waitedAfterSpike) {
               //    waitedAfterSpike = false;
               // }
               lastPieces = lastSavings / currentPrice;
               lastSavings = 0;
               annotations.push({
                  unixLabel: currentLabel,
                  action: waitedAfterSpike ? 'Buy (AS)' : 'Buy',
                  color: '#6610f2',
                  counter,
               });
            } else {
               continue;
            }
         }

         if (lastAction === 'buy') {
            console.log('last buy :>> ', currentPrice);
            if (calcLastAction === 'sold') {
               console.log('sold :>> ');
               lastSavings = currentPrice * lastPieces;
               lastPieces = 0;
               annotations.push({ unixLabel: currentLabel, action: 'Sold', color: '#4dbd74', counter });
            } else {
               continue;
            }
         }

         lastAction = calcLastAction;
         lastActionDate = calcLastActionDate;
         maxSavings = savings;
      }

      // console.log('calcLastActionDate :>> ', calcLastActionDate);
      transactionList.push({
         action: lastAction,
         rule,
         savings: lastSavings,
         maxSavings,
         days,
         tolerance,
         transactions,
         price: currentPrice,
         pieces: lastPieces,
         date: endOfCalc,
         calcDate: lastActionDate,
         counter,
      });
      counter++;
      // console.log('lastSavings :>> ', lastSavings);
      // console.log('lastPieces :>> ', lastPieces);
      // console.log('lastAction :>> ', lastAction);
      // console.log('lastActionDate :>> ', lastActionDate);

      sendNotification(SIMULATION, {
         type: 'cycle update action',
         data: {
            currentPrice,
            calcLastActionDate,
            lastSavings,
            lastPieces,
            lastAction,
            lastActionDate,
         },
      });
      await sleep(0);
   }

   sendNotification(SIMULATION, {
      type: 'completed',
      data: {
         annotations: annotationTransform(annotations),
         transactionList,
         chartData,
      },
   });
}
