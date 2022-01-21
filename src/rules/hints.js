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
const PLATEAU_MIN_LENGTH = 5;
const PLATEAU_TOLERANCE_PERCENT = 3;

export function peakDetection(dayData) {
   let negativeSlope = false;
   let positiveSlope = false;
   let start = true;
   let currentPlateauLength = 1;
   let currentUpperPlateauThreshold = 0;
   let currentBottomPlateauThreshold = 0;

   let currentPeak = dayData[0];
   const foundPeaks = [];

   dayData.forEach((quote, idx, dataArray) => {
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
         console.log('\n\n idx:>> ', idx);
         if (currentPlateauLength === 1) {
            const upperPlateauThreshold = upperThreshold(dataArray[idx - 1].value, PLATEAU_TOLERANCE_PERCENT);
            const bottomPlateauThreshold = bottomThreshold(dataArray[idx - 1].value, PLATEAU_TOLERANCE_PERCENT);
            console.log('1  upperPlateauThreshold:>> ', upperPlateauThreshold);
            console.log('1  bottomPlateauThreshold:>> ', bottomPlateauThreshold);
            console.log('value:>> ', value);
            console.log('date:>> ', moment.unix(quote.date).format('YYYY-MM-DD'));
            if (bottomPlateauThreshold <= value && value <= upperPlateauThreshold) {
               currentUpperPlateauThreshold = upperPlateauThreshold;
               currentBottomPlateauThreshold = bottomPlateauThreshold;
               currentPlateauLength = 2;
            }
         } else {
            // currentPlateauLength > 1
            const upperPlateauThreshold = currentUpperPlateauThreshold;
            const bottomPlateauThreshold = currentBottomPlateauThreshold;
            console.log('>1  currentPlateauLength:>> ', currentPlateauLength);
            console.log('>1  upperPlateauThreshold:>> ', upperPlateauThreshold);
            console.log('>1  bottomPlateauThreshold:>> ', bottomPlateauThreshold);
            console.log('value:>> ', value);
            console.log('date:>> ', moment.unix(quote.date).format('YYYY-MM-DD'));
            if (bottomPlateauThreshold <= value && value <= upperPlateauThreshold) {
               console.log('next value:>> ');

               currentPlateauLength += 1;
            } else {
               if (currentPlateauLength >= PLATEAU_MIN_LENGTH) {
                  console.log('+++++ new plateau end:>> ');
                  console.log(
                     'start :>> ',
                     moment.unix(dataArray[idx - currentPlateauLength].date).format('YYYY-MM-DD'),
                  );
                  console.log('end :>> ', moment.unix(dataArray[idx - 1].date).format('YYYY-MM-DD'));
                  foundPeaks.push({ ...dataArray[idx - currentPlateauLength], type: 'plateau_start' });
                  foundPeaks.push({ ...dataArray[idx - 1], type: 'plateau_end' });
               }
               console.log('---- plateau too short:>> ');
               currentPlateauLength = 1;
            }
         }

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

function upperThreshold(reference, percentage = PEAK_PERCENT) {
   return reference + (reference * percentage) / 100;
}

function bottomThreshold(reference, percentage = PEAK_PERCENT) {
   return reference - (reference * percentage) / 100;
}
