import {catalog,validateCatalog} from '../packages/content/src/index';
const errors=validateCatalog();if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log(`Validated ${Object.values(catalog).flat().length} records with Ajv and reference checks.`);
