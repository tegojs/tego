import TachybaseGlobal from '@tachybase/globals';

const pgOnly = () => (TachybaseGlobal.settings.database.dialect === 'postgres' ? describe : describe.skip);

export default pgOnly;
