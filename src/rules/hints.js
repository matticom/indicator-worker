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

// min de/increase after new peak, so that acknowledged as peak
const PEAK_PERCENT = 10;

// if percentage not reached max after X time units acknowledged as peak
// the less volatile the asset price the longer this value (e.g. Gold = very low volatile => 60 days)
const MAX_PEAK_DETERMINATION = 60;
const PLATEAU_MIN_LENGTH = 15;
const PLATEAU_TOLERANCE_PERCENT = 1;

export function peakPlateauDetection(dayData) {
   let negativeSlope = false;
   let positiveSlope = false;
   let start = true;
   let currentPlateauLength = 1;
   let currentUpperPlateauThreshold = 0;
   let currentBottomPlateauThreshold = 0;

   let currentPeak = dayData[0];
   const foundPeakPlateau = [];
   let peakAcknowledgeCounter = 0;

   dayData.forEach((quote, idx, dataArray) => {
      const { value } = quote;
      console.log('\n------> date :>> ', moment.unix(dataArray[idx].date).format('YYYY-MM-DD'));
      console.log('value :>> ', value);
      console.log(`currentPeak (${negativeSlope ? 'low' : 'high'}):>> `, currentPeak);
      console.log('peakAcknowledgeCounter :>> ', peakAcknowledgeCounter);
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
         if (currentPlateauLength === 1) {
            const upperPlateauThreshold = upperThreshold(dataArray[idx - 1].value, PLATEAU_TOLERANCE_PERCENT);
            const bottomPlateauThreshold = bottomThreshold(dataArray[idx - 1].value, PLATEAU_TOLERANCE_PERCENT);
            if (bottomPlateauThreshold <= value && value <= upperPlateauThreshold) {
               currentUpperPlateauThreshold = upperPlateauThreshold;
               currentBottomPlateauThreshold = bottomPlateauThreshold;
               currentPlateauLength = 2;
            }
         } else {
            // currentPlateauLength > 1
            const upperPlateauThreshold = currentUpperPlateauThreshold;
            const bottomPlateauThreshold = currentBottomPlateauThreshold;
            if (bottomPlateauThreshold <= value && value <= upperPlateauThreshold) {
               currentPlateauLength += 1;
            } else {
               if (currentPlateauLength >= PLATEAU_MIN_LENGTH) {
                  foundPeakPlateau.push({ ...dataArray[idx - currentPlateauLength], type: 'plateau_start' });
                  foundPeakPlateau.push({ ...dataArray[idx - 1], type: 'plateau_end' });
               }
               currentPlateauLength = 1;
            }
         }

         if (positiveSlope) {
            console.log('vv bottomThreshold :>> ', bottomThreshold(currentPeak.value));
            peakAcknowledgeCounter++;
            if (value < bottomThreshold(currentPeak.value) || peakAcknowledgeCounter > MAX_PEAK_DETERMINATION) {
               negativeSlope = true;
               positiveSlope = false;
               foundPeakPlateau.push({ ...currentPeak, type: 'high' });
               console.log('----- // ------ found high peak :>> ', { ...currentPeak });
               peakAcknowledgeCounter = 0;
               currentPeak = quote; // new low peak (2)
            }
            if (currentPeak.value < quote.value) {
               console.log('found new higher peak (1) ');
               currentPeak = quote; // found new higher peak (1)
               peakAcknowledgeCounter = 0;
            }
         }
         if (negativeSlope) {
            console.log('^^upperThreshold :>> ', upperThreshold(currentPeak.value));
            peakAcknowledgeCounter++;
            if (value > upperThreshold(currentPeak.value) || peakAcknowledgeCounter > MAX_PEAK_DETERMINATION) {
               negativeSlope = false;
               positiveSlope = true;
               foundPeakPlateau.push({ ...currentPeak, type: 'low' });
               console.log('----- // ------ found low peak :>> ', { ...currentPeak });
               peakAcknowledgeCounter = 0;
               currentPeak = quote; // new high peak (2)
            }
            if (currentPeak.value > quote.value) {
               console.log('found new lower peak (1) ');
               currentPeak = quote; // found new lower peak (1)
               peakAcknowledgeCounter = 0;
            }
         }
      }
   });
   return foundPeakPlateau.map(({ value, date, type }) => ({
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
