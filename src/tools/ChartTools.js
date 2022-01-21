import moment from 'moment';

export function getNewDataSet(data, labelName, color = 'black') {
   return {
      label: labelName,
      backgroundColor: 'rgb(0, 0, 0, 0.1)',
      borderColor: color,
      borderWidth: 2,
      data,
      hidden: false,
      fill: false,
   };
}

export function annotationTransform(rawAnnotations) {
   return rawAnnotations.map((anno) => {
      const { unixLabel, action, color, counter } = anno;
      return getAnnotation(moment.unix(unixLabel).format('D. MMM YYYY'), action, color, counter);
   });
}

export function getAnnotation(value, label, color, counter) {
   return {
      drawTime: 'afterDatasetsDraw',
      id: `hline-${counter + Math.round(Math.random() * 1000)}`,
      type: 'line',
      // mode: 'horizontal',
      scaleID: 'x-axis-0',
      value,
      borderColor: color,
      borderWidth: 1,
      label: {
         backgroundColor: 'rgba(0,0,0, 0.9)',
         content: label,
         enabled: true,
         yAdjust: getYposition(counter),
      },
   };
}

export function getYposition(counter) {
   const maxCount = 5;
   const modulo = counter % maxCount;
   return -25 * modulo + 50;
}
