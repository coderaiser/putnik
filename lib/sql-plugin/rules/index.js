import * as addFileToWhere from './add-file-to-where/index.js';
import * as addFileToFixWhere from './add-file-to-fix-where/index.js';
import * as addParentTypeToJoin from './add-parent-type-to-join/index.js';
import * as addFileToJoin from './add-file-to-join/index.js';
import * as expandTypedUpdate from './expand-typed-update/index.js';
import * as checkTypedUpdateHasList from './check-typed-update-has-list/index.js';
import * as convertArithmeticToTuple from './convert-arithmetic-to-tuple/index.js';
import * as addIdToSelect from './add-id-to-select/index.js';
import * as addLocationToSelect from './add-location-to-select/index.js';
import * as checkReportHasMessage from './check-report-has-message/index.js';

export const rules = {
    'add-file-to-where': addFileToWhere,
    'add-file-to-fix-where': addFileToFixWhere,
    'add-file-to-join': addFileToJoin,
    'expand-typed-update': expandTypedUpdate,
    'check-typed-update-has-list': checkTypedUpdateHasList,
    'convert-arithmetic-to-tuple': convertArithmeticToTuple,
    'add-id-to-select': addIdToSelect,
    'add-parent-type-to-join': addParentTypeToJoin,
    'add-location-to-select': addLocationToSelect,
    'check-report-has-message': checkReportHasMessage,
};
