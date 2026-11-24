import { connect, mapReadPretty, ReactFC } from '@tachybase/schema';

import { InputNumber, type InputNumberProps } from 'antd';

import { PreviewText } from '../preview-text';

export const NumberPicker: ReactFC<InputNumberProps> = connect(InputNumber, mapReadPretty(PreviewText.NumberPicker));

export default NumberPicker;
