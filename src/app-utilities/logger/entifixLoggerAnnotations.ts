import { EntifixLoggerContext } from './entifixLoggerContext';
import { EMEntity } from '../../express-mongoose/emEntity/emEntity';
import { EntifixLogger } from './entifixLogger';
import { EMSession } from '../../express-mongoose/emSession/emSession';

function LogContextBaseInstance();
function LogContextBaseInstance(params: { fileName?: string });
function LogContextBaseInstance(params?: { fileName?: string }) {
  return function (target: any, key: string) {
    _setContextMetadata(target, { baseContextProperty: key });

    Object.defineProperty(target, key, {
      get: function () {
        let objectInstance = this;
        let internalKey = `__${key}`;

        if (!objectInstance[internalKey])
          objectInstance[internalKey] = new EntifixLoggerContext()
            .setClassName(target.constructor.name)
            .setFileName(params?.fileName)
            .setSession(objectInstance instanceof EMEntity ? objectInstance.session : null);

        return objectInstance[internalKey];
      },
      configurable: true,
      enumerable: true,
    });
  };
}

function LogContextMethod() {
  return function (target: Object, key: string, descriptor: TypedPropertyDescriptor<Function>) {
    let contextParamIndex = _getParamContextMetadata(target, key);

    let originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      let objectInstance = this;
      let session = objectInstance instanceof EMEntity ? objectInstance.session : null;
      _logDebug(`Call [${key}] in object type [${target.constructor.name}]`, '@LogContextMethod', 'herber230', session);

      if (contextParamIndex != null) {
        let contextMetadata = _getContextMetadata(objectInstance);
        let subContext: EntifixLoggerContext;

        if (contextMetadata && objectInstance[contextMetadata.baseContextProperty]) {
          subContext = (objectInstance[contextMetadata.baseContextProperty] as EntifixLoggerContext).clone();
        } else {
          subContext = new EntifixLoggerContext();
          if (args && args.length > 0) {
            let paramsPairSession = args.find(a => a instanceof EMSession);
            if (paramsPairSession) subContext.setSession(paramsPairSession);
          }
        }

        args[contextParamIndex] = subContext.setMethodName(key);
      }

      return originalMethod.apply(this, args);
    };
  };
}

function LogContextParam() {
  return function (target: Object, key: string, index: number) {
    _setParamContextMetadata(target, key, index);
  };
}

//ANNOTATION LOGIC
//==============================================================================================================================================

const LoggerContextMetadaKey = Symbol('LoggerContextMetadaKey');
const LoggerParamMetaKey = Symbol('LoggerParamMetaKey');

interface LoggerContextMetadata {
  baseContextProperty: string;
}

function _setContextMetadata(target: any, metadata: LoggerContextMetadata) {
  Reflect.defineMetadata(LoggerContextMetadaKey, metadata, target);
}

function _getContextMetadata(target: any): LoggerContextMetadata {
  return Reflect.getMetadata(LoggerContextMetadaKey, target);
}

function _setParamContextMetadata(target: any, key: string, paramIndex) {
  Reflect.defineMetadata(LoggerParamMetaKey, { paramIndex }, target, key);
}

function _getParamContextMetadata(target: any, key: string): number {
  let data = Reflect.getMetadata(LoggerParamMetaKey, target, key);
  return data ? data.paramIndex : null;
}

function _logDebug(message: string, method: string, developer: string, session: EMSession) {
  EntifixLogger.debug({
    message,
    developer,
    origin: { file: 'entifixLoggerAnnotation', method },
    systemOwner: session?.privateUserData?.systemOwnerSelected,
    user: session?.privateUserData?.userName,
  });
}

export { LogContextBaseInstance, LogContextParam, LogContextMethod };
