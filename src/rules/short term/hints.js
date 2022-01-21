import moment from 'moment';
import { percent } from '../../tools/General';
import { RECENTLY_DROPPED_PERCENT, RECENTLY_TIME_SPAN_DAYS } from '../../constants';

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

export function staticPercentThresholds(data, thresholdArray) {
   const reference = data[0].value;
   const lastElementIdx = data.length - 1;

   let result = { last: null };
   const history = [
      {
         threshold: 0,
         type: 'ref',
         dateStr: moment.unix(data[0].date).format('YYYY-MM-DD'),
         date: data[0].date,
         value: reference,
      },
   ];

   let reachedPositiveThresholds = 0;
   let reachedNegativeThresholds = 0;

   data.forEach(({ value, date }, idx) => {
      // console.log('\nn current idx :>> ', idx);
      // console.log('lastElementIdx :>> ', lastElementIdx);
      // console.log('reachedNegativeThresholds :>> ', reachedNegativeThresholds);
      const thresholds = thresholdArray.sort((a, b) => b - a);
      for (let index = 0; index < thresholds.length; index++) {
         const threshold = thresholds[index];
         // console.log('threshold :>> ', threshold);
         // console.log('value :>> ', value);
         if (reference + percent(threshold, reference) <= value) {
            if (threshold > reachedPositiveThresholds) {
               const entry = {
                  threshold,
                  type: 'positive',
                  dateStr: moment.unix(date).format('YYYY-MM-DD'),
                  date,
                  value,
               };
               if (idx === lastElementIdx) {
                  result = { last: entry };
               } else {
                  history.push(entry);
                  reachedPositiveThresholds = threshold;
               }
            }
         }
         // console.log('low limit :>> ', reference - percent(threshold, reference));
         if (reference - percent(threshold, reference) >= value) {
            // console.log('less than :>> ');
            if (threshold > reachedNegativeThresholds) {
               // console.log('less than last threshold :>> ');
               const entry = {
                  threshold,
                  type: 'negative',
                  dateStr: moment.unix(date).format('YYYY-MM-DD'),
                  date,
                  value,
               };
               if (idx === lastElementIdx) {
                  result = { last: entry };
               } else {
                  history.push(entry);
                  reachedNegativeThresholds = threshold;
               }
            }
         }
      }
   });

   return { ...result, history };
}
