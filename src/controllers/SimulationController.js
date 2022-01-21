import moment from 'moment';
import { INITIAL_MONEY, SIMULATION } from '../constants';
import { peakDetection, recentlyDropped } from '../rules/hints';
import { afterBuyDropThresholdReached, peakDropReachedThreshold, waitAfterSpike } from '../rules/rules';
import { staticPercentThresholds } from '../rules/short term/hints';
import { sendNotification } from '../services/CommunicationService';
import { evaluateParams } from '../services/ParamEvalutionService';
import { getNewDataSet, annotationTransform } from '../tools/ChartTools';
import { sleep } from '../tools/General';

let stopFlag = false;
let connected = false;

export function stopSimulation() {
   stopFlag = true;
}

export function setConnected() {
   connected = true;
}

export function setDisconnected() {
   connected = false;
}

export async function simulate(start, end, simuCalcWindow, sourceData) {
   stopFlag = false;
   const beforeCalcStarted = 30;
   const rawData = sourceData.filter((data) => data.date >= start && data.date <= end);

   const data = rawData.map((dayData) => dayData.value);
   const labels = rawData.map((dayData) => moment.unix(dayData.date).format('D. MMM YYYY'));
   const chartData = { labels, datasets: [getNewDataSet(data, 'Currency')] };

   if (data.length + 1 < beforeCalcStarted) {
      console.log(`Selected start-end-range is to small!`);
      sendNotification(SIMULATION, { type: 'stop' });
      return;
   }

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
      const offsetStart = index;
      const secureWindow = simuCalcWindow ? (simuCalcWindow < offsetStart ? simuCalcWindow : offsetStart) : 0;

      const startOfCalc = simuCalcWindow ? rawData[index - secureWindow].date : 0;
      const endOfCalc = rawData[index].date;

      const dataToBeCalc = simuCalcWindow
         ? rawData.filter((data) => data.date >= startOfCalc && data.date <= endOfCalc)
         : rawData.filter((data) => data.date <= endOfCalc);

      const currentLastIndex = dataToBeCalc.length - 1;

      const { topX } = evaluateParams([...dataToBeCalc]);
      const startLabel = dataToBeCalc[0].date;
      const currentLabel = endOfCalc;
      // console.log('\n\n>>>> new cycle :>> ', counter);
      // console.log('start Of cycle :>> ', startLabel);
      // console.log('end Of cycle :>> ', currentLabel);
      // console.log('dataToBeCalc :>> ', dataToBeCalc);

      // interesting -----
      // console.log('dataToBeCalc length:>> ', dataToBeCalc.length);
      // console.log('currentLastIndex:>> ', currentLastIndex);

      const result = topX.length === 0 ? 'nada' : topX[0];

      // interesting -----
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

      // interesting -----
      // console.log('current Price :>> ', currentPrice);

      // just indicator
      recentlyDropped(dataToBeCalc, currentLastIndex);

      if (lastAction === 'buy') {
         if (afterBuyDropThresholdReached(transactionList, currentPrice)) {
            ruleApplied = true;
            lastSavings = currentPrice * lastPieces;
            lastPieces = 0;
            annotations.push({ unixLabel: currentLabel, action: 'Sold (ABD)', color: '#4dbd74', counter });
            lastAction = 'sold';
            rule = 'ABD';
            lastActionDate = currentLabel;
         } else if (peakDropReachedThreshold(dataToBeCalc, currentLastIndex, transactionList)) {
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
               // if (waitAfterSpike(dataToBeCalc, currentLastIndex)) {
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
            // interesting -----
            // console.log('last buy :>> ', currentPrice);
            if (calcLastAction === 'sold') {
               // interesting -----
               // console.log('sold :>> ');
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

      if (connected) {
         // console.log('Connected :>> ', connected);
      } else {
         console.log('Disconnected, wait for some seconds');
         await sleep(5000);
         console.log('Connection state', connected);
      }

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
      await sleep(500);
   }

   // const thresholds = [5, 10, 20, 30, 60, 100, 250, 500, 1000];
   // let res = staticPercentThresholds([...rawData].slice(25, rawData.length), thresholds);
   // console.log('res :>> ', res);
   // res.history.forEach((event, idx) => {
   //    annotations.push({
   //       unixLabel: event.date,
   //       action: `${event.type === 'positive' ? '+' : '-'} ${event.threshold}%`,
   //       color: event.type === 'positive' ? '#cead74' : '#c610f2',
   //       counter: annotations.length + idx,
   //    });
   // });

   const peaks = peakDetection([...rawData].slice(0, 100));
   const labelColors = {
      low: '#c610f2',
      high: '#cead74',
      plateau_start: '#9ed7a5',
      plateau_end: '#1e97f5',
   };

   peaks.forEach(({ date, type }, idx) => {
      annotations.push({
         unixLabel: date,
         action: type,
         color: labelColors[type],
         counter: annotations.length + idx,
      });
   });

   console.log(
      ' :>> ',
      [...rawData].slice(0, 80).map((ele) => ({ ...ele, dateStr: moment.unix(ele.date).format('YYYY-MM-DD') })),
   );

   sendNotification(SIMULATION, {
      type: 'completed',
      data: {
         annotations: annotationTransform(annotations),
         transactionList,
         chartData,
      },
   });
}
