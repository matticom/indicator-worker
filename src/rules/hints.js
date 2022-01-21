import moment from 'moment';
import { RECENTLY_DROPPED_PERCENT, RECENTLY_TIME_SPAN_DAYS } from '../constants';

export function recentlyDropped(data, currentIdx) {
   // console.log('data.length :>> ', data.length);
   const currentValue = data[currentIdx].value;
   const countOfLookBackIntervals = data.length < RECENTLY_TIME_SPAN_DAYS ? data.length - 1 : RECENTLY_TIME_SPAN_DAYS;
   const consideredData = data.slice(currentIdx - countOfLookBackIntervals, currentIdx);
   const maxValue = Math.max(...consideredData.map((d) => d.value));
   if (countOfLookBackIntervals > 0 && currentValue > data[currentIdx - 1].value) {
      return;
   }
   // console.log('consideredData :>> ', consideredData);
   // console.log('maxValue :>> ', maxValue);
   const dropValue = 100 - (100 * currentValue) / maxValue;
   // interesting -----
   // console.log('dropValue :>> ', dropValue);
   // console.log('current date :>> ', moment.unix(data[currentIdx].date).format('D. MMM YYYY'));
   const dpThresholdReached = dropValue > RECENTLY_DROPPED_PERCENT;
   if (dpThresholdReached) {
      // interesting -----
      // console.log(
      //    `!!!! Drop of more than ${RECENTLY_DROPPED_PERCENT}:>> `,
      //    moment.unix(data[currentIdx].date).format('D. MMM YYYY'),
      // );
   }
}

// what about slight declines -2 +1 -3 +1 -2 --> sliding windows --> acknowledge = reset

const PEAK_PERCENT = 10;

export function peakDetection(dayData) {
   let negativeSlope = false;
   let positiveSlope = false;
   let start = true;

   let currentPeak = dayData[0];
   const foundPeaks = [];

   dayData.forEach((quote) => {
      const { value } = quote;
      if (start) {
         if (value > upperThreshold(currentPeak.value)) {
            positiveSlope = true;
            currentPeak = quote;
            start = false;
         }
         if (value < bottomThreshold(currentPeak.value)) {
            negativeSlope = true;
            currentPeak = quote;
            start = false;
         }
      } else {
         if (positiveSlope) {
            if (value < bottomThreshold(currentPeak.value)) {
               negativeSlope = true;
               positiveSlope = false;
               foundPeaks.push({ ...currentPeak, type: 'high' });
               currentPeak = quote; // new low peak
            }
            if (currentPeak.value < quote.value) {
               currentPeak = quote;
            }
         }
         if (negativeSlope) {
            if (value > upperThreshold(currentPeak.value)) {
               negativeSlope = false;
               positiveSlope = true;
               foundPeaks.push({ ...currentPeak, type: 'low' });
               currentPeak = quote; // new high peak
            }
            if (currentPeak.value > quote.value) {
               currentPeak = quote;
            }
         }
      }
   });
   return foundPeaks.map(({ value, date, type }) => ({
      value,
      date,
      dateStr: moment.unix(date).format('YYYY-MM-DD'),
      type,
   }));
}

function upperThreshold(reference) {
   return reference + (reference * PEAK_PERCENT) / 100;
}

function bottomThreshold(reference) {
   return reference - (reference * PEAK_PERCENT) / 100;
}
