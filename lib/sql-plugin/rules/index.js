import * as addFileToWhere from './add-file-to-where/index.js';
import * as addFileToFixWhere from './add-file-to-fix-where/index.js';
import * as addIdToSelect from './add-id-to-select/index.js';
import * as addLocationToSelect from './add-location-to-select/index.js';
import * as checkReportHasMessage from './check-report-has-message/index.js';

export const rules = {
    'add-file-to-where': addFileToWhere,
    'add-file-to-fix-where': addFileToFixWhere,
    'add-id-to-select': addIdToSelect,
    'add-location-to-select': addLocationToSelect,
    'check-report-has-message': checkReportHasMessage,
};
