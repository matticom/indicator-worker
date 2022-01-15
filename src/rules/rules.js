import moment from 'moment';
import {
   LOOK_BACK_FOR_PEAK_WINDOW_IN_DAYS,
   MAX_DROP_PERCENT,
   MAX_TWO_DAY_SPIKE_PERCENT,
   WAITING_AFTER_SPIKE_DAYS,
   MAX_DROP_AFTER_BUY,
} from '../constants';

// short V rules (drop within some hours and right away increase)

export function peakDropReachedThreshold(data, currentIdx, transactionList) {
   const buys = transactionList.filter((entry) => entry.action === 'buy');
   let useLastBuy = false;
   let lastBuyIdx = 0;
   if (transactionList.length > 0) {
      const lastBuy = transactionList[transactionList.length - 1];
      // lastBuyTimestamp = lastBuy.date;
      const foundIndex = data.findIndex((ele) => ele.date === lastBuy.date);
      lastBuyIdx = foundIndex;
      if (currentIdx - foundIndex < LOOK_BACK_FOR_PEAK_WINDOW_IN_DAYS) {
         useLastBuy = true;
      }
   }

   const currentValue = data[currentIdx].value;
   const countOfLookBackIntervals =
      data.length < LOOK_BACK_FOR_PEAK_WINDOW_IN_DAYS ? data.length - 1 : LOOK_BACK_FOR_PEAK_WINDOW_IN_DAYS;
   const consideredData = data.slice(useLastBuy ? lastBuyIdx : currentIdx - countOfLookBackIntervals, currentIdx);
   const maxValue = Math.max(...consideredData.map((d) => d.value));
   const dpThresholdReached = 100 - (100 * currentValue) / maxValue > MAX_DROP_PERCENT;
   if (dpThresholdReached) {
      // console.log('transactionList :>> ', transactionList);
      // console.log('current date :>> ', moment.unix(data[currentIdx].date).format('D. MMM YYYY'));
      // console.log('currentIdx :>> ', currentIdx);
      // console.log('countOfLookBackIntervals :>> ', countOfLookBackIntervals);
      // console.log('lastbuy :>> ', data[lastBuyIdx]);
      // console.log('useLastBuy :>> ', useLastBuy);
      // console.log('maxValue :>> ', maxValue);
   }
   return dpThresholdReached;
}

export function waitAfterSpike(data, currentIdx) {
   const maxLength = data.length - currentIdx;
   const consideredData = data.slice(
      maxLength < WAITING_AFTER_SPIKE_DAYS ? maxLength : WAITING_AFTER_SPIKE_DAYS,
      currentIdx,
   );
   const twoDaySpikes = [];
   for (let index = 1; index < consideredData.length; index++) {
      const day1 = consideredData[index - 1].value;
      const day2 = consideredData[index].value;
      twoDaySpikes.push(day1 + day2);
   }
   const maxValue = Math.max(...twoDaySpikes);
   return maxValue > MAX_TWO_DAY_SPIKE_PERCENT;
}

export function afterBuyDropThresholdReached(transactionList, currentPrice) {
   if (transactionList.length === 0) return false;
   const { price } = transactionList[transactionList.length - 1];
   return 100 - (currentPrice * 100) / price > MAX_DROP_AFTER_BUY;
}
