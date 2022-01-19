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
