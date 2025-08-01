import dayjs from 'dayjs';
import _ from 'lodash';

export interface Str2momentOptions {
  gmt?: boolean;
  picker?: 'year' | 'month' | 'week' | 'quarter';
  utcOffset?: any;
  utc?: boolean;
}

export const getDefaultFormat = (props: any) => {
  if (props.format) {
    return props.format;
  }
  if (props.dateFormat) {
    if (props['showTime']) {
      return `${props.dateFormat} ${props.timeFormat || 'HH:mm:ss'}`;
    }
    return props.dateFormat;
  }
  if (props['picker'] === 'month') {
    return 'YYYY-MM';
  } else if (props['picker'] === 'quarter') {
    return 'YYYY-\\QQ';
  } else if (props['picker'] === 'year') {
    return 'YYYY';
  } else if (props['picker'] === 'week') {
    return 'YYYY-wo';
  }
  return props['showTime'] ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD';
};

export const toGmt = (value: dayjs.Dayjs) => {
  if (!value || !dayjs.isDayjs(value)) {
    return value;
  }
  return `${value.format('YYYY-MM-DD')}T${value.format('HH:mm:ss.SSS')}Z`;
};

export const toLocal = (value: dayjs.Dayjs) => {
  if (!value) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((val) => val.startOf('second').toISOString());
  }
  if (dayjs.isDayjs(value)) {
    return value.startOf('second').toISOString();
  }
};

// 将UTC时间字符串转换为本地时区时间
export const convertUTCToLocal = (utcString, formater = 'YYYY-MM-DD HH:mm:ss') => {
  // 使用dayjs解析UTC时间，并转换为本地时区时间
  const localDate = dayjs.utc(utcString).local().format(formater);
  return localDate;
};

const toMoment = (val: any, options?: Str2momentOptions) => {
  if (!val) {
    return;
  }
  const offset = options.utcOffset || -1 * new Date().getTimezoneOffset();
  const { gmt, picker, utc = true } = options;

  if (!utc) {
    return dayjs(val);
  }

  if (dayjs.isDayjs(val)) {
    return val.utcOffset(offsetFromString(offset));
  }
  if (gmt || picker) {
    return dayjs(val).utcOffset(0);
  }
  return dayjs(val).utcOffset(offsetFromString(offset));
};

export const str2moment = (value?: string | string[], options: Str2momentOptions = {}): any => {
  return Array.isArray(value)
    ? value.map((val) => {
        return toMoment(val, options);
      })
    : value
      ? toMoment(value, options)
      : value;
};

const toStringByPicker = (value, picker) => {
  if (picker === 'year') {
    return value.format('YYYY') + '-01-01T00:00:00.000Z';
  }
  if (picker === 'month') {
    return value.format('YYYY-MM') + '-01T00:00:00.000Z';
  }
  if (picker === 'quarter') {
    return value.format('YYYY-MM') + '-01T00:00:00.000Z';
  }
  if (picker === 'week') {
    return value.format('YYYY-MM-DD') + 'T00:00:00.000Z';
  }
  return value.format('YYYY-MM-DD') + 'T00:00:00.000Z';
};

const toGmtByPicker = (value: dayjs.Dayjs | dayjs.Dayjs[], picker?: any) => {
  if (!value) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((val) => toStringByPicker(val, picker));
  }
  if (dayjs.isDayjs(value)) {
    return toStringByPicker(value, picker);
  }
};

export interface Moment2strOptions {
  showTime?: boolean;
  gmt?: boolean;
  picker?: 'year' | 'month' | 'week' | 'quarter';
}

export const moment2str = (value?: dayjs.Dayjs, options: Moment2strOptions = {}) => {
  const { showTime, gmt, picker } = options;
  if (!value) {
    return value;
  }
  if (showTime) {
    return gmt ? toGmt(value) : toLocal(value);
  }
  return toGmtByPicker(value, picker);
};

/**
 * from https://github.com/moment/moment/blob/dca02edaeceda3fcd52b20b51c130631a058a022/src/lib/units/offset.js#L55-L70
 */
export function offsetFromString(string: string | number) {
  if (!_.isString(string)) {
    return string;
  }

  // timezone chunker
  // '+10:00' > ['10',  '00']
  // '-1530'  > ['-15', '30']
  const chunkOffset = /([+-]|\d\d)/gi;

  const matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi, // +00 -00 +00:00 -00:00 +0000 -0000 or Z
    matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

  let matches = (string || '').match(matchShortOffset);
  if (matches === null) {
    matches = (string || '').match(matchTimestamp);
  }

  if (matches === null) {
    return null;
  }

  const chunk = matches[matches.length - 1] || [];
  const parts = (chunk + '').match(chunkOffset) || ['-', 0, 0];
  const minutes = +(Number(parts[1]) * 60) + toInt(parts[2]);

  return minutes === 0 ? 0 : parts[0] === '+' ? minutes : -minutes;
}

function toInt(argumentForCoercion) {
  // eslint-disable-next-line prefer-const
  let coercedNumber = +argumentForCoercion,
    value = 0;

  if (coercedNumber !== 0 && isFinite(coercedNumber)) {
    value = absFloor(coercedNumber);
  }

  return value;
}

function absFloor(number) {
  if (number < 0) {
    // -0 -> 0
    return Math.ceil(number) || 0;
  } else {
    return Math.floor(number);
  }
}
