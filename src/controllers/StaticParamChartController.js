import moment from 'moment';
import { INITIAL_MONEY } from '../constants';
import { getXDayLineData, calcProfit } from '../services/BasicService';
import { evaluateParams } from '../services/ParamEvalutionService';
const { getNewDataSet, annotationTransform } = require('../tools/ChartTools');

export function calcChartWithGivenParams(start, end, optimumParams, rawData) {
   const { tolerance, days } = optimumParams;
   let sourceData = rawData;
   if (start !== undefined) {
      if (end !== undefined) {
         sourceData = rawData.filter((data) => data.date >= start && data.date <= end);
      } else {
         end = rawData[rawData.length - 1].date;
         sourceData = rawData.filter((data) => data.date >= start);
      }
   }
   const data = sourceData.map((dayData) => dayData.value);
   const labels = sourceData.map((dayData) => moment.unix(dayData.date).format('D. MMM YYYY'));
   const unixLabels = sourceData.map((dayData) => dayData.date);
   const { xDayLine: lineX, plusLimit: lineXPlus, minusLimit: lineXMinus } = getXDayLineData(days, data, tolerance);
   const { stepAnnotations, lastSold } = calcProfit(days, unixLabels, data, lineXMinus, lineXPlus);
   const { savings, transactions } = lastSold;
   const chartData = {
      labels,
      datasets: [
         getNewDataSet(data, 'Currency'),
         getNewDataSet(lineXMinus, `- ${tolerance}%`, '#6610f2'),
         getNewDataSet(lineXPlus, `+ ${tolerance}%`, '#f86c6b'),
         getNewDataSet(lineX, `${days} days`, '#20c997'),
      ],
   };

   return {
      chartData,
      annotations: annotationTransform(stepAnnotations),
      topX: [{ savings, transactions, tolerance, days }],
   };
}

export function calcChartWithBestParams(start, end, rawData) {
   const { chart3dData, topX, data, unixLabels } = evaluateParams([...rawData], start, end);
   const labels = unixLabels.map((uLabels) => moment.unix(uLabels).format('D. MMM YYYY'));

   if (topX.length === 0 || (topX.length > 0 && topX[0].savings <= INITIAL_MONEY)) {
      return {
         chartData: {
            labels,
            datasets: [getNewDataSet(data, 'Currency')],
         },
         chart3dData,
         annotations: [],
         topX,
      };
   }

   const { savings, days, tolerance, transactions } = topX[0];

   const { xDayLine: lineX, plusLimit: lineXPlus, minusLimit: lineXMinus } = getXDayLineData(days, data, tolerance);

   const { stepAnnotations, lastSold } = calcProfit(days, unixLabels, data, lineXMinus, lineXPlus);
   // console.log('annotations :>> ', annotations);
   // console.log('line200 :>> ', line200);

   const chartData = {
      labels,
      datasets: [
         getNewDataSet(data, 'Currency'),
         getNewDataSet(lineXMinus, `- ${tolerance}%`, '#6610f2'),
         getNewDataSet(lineXPlus, `+ ${tolerance}%`, '#f86c6b'),
         getNewDataSet(lineX, `${days} days`, '#20c997'),
      ],
   };

   return { chartData, chart3dData, annotations: annotationTransform(stepAnnotations), topX };
}
