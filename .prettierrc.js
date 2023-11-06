import base from '@ttionya/prettier-config'
import jsdoc from '@ttionya/prettier-config/jsdoc'
import { mergeConfigs } from '@ttionya/prettier-config/utils'

export default mergeConfigs([base, jsdoc])
