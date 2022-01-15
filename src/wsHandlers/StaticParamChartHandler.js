import { BEST_STATIC_PARAM, GIVEN_STATIC_PARAM } from '../constants';
import { calcChartWithBestParams, calcChartWithGivenParams } from '../controllers/StaticParamChartController';
import { sendNotification } from '../services/CommunicationService';

const rawData = require('../../data/LongHistoryBTC.json');

export function getChartWithGivenParams({ start, end, optimumParams }) {
   const response = calcChartWithGivenParams(start, end, optimumParams, rawData);
   sendNotification(GIVEN_STATIC_PARAM, { response, start, end });
}

export function getChartWithBestParams({ start, end }) {
   const response = calcChartWithBestParams(start, end, rawData);
   sendNotification(BEST_STATIC_PARAM, { response, start, end });
}
