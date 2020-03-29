import { Schema, Document, Model } from "mongoose";
import { EMServiceSession } from "../emServiceSession/emServiceSession";
import { EMSession } from "../emSession/emSession";


interface CounterModel extends Document {
    name: string;
    entityName: string;
    type: string;
    currentValue: number;
    created: Date;
    modified?: Date
} 

const counterSchema = new Schema({
    name: String,
    entityName: String,
    type: String,
    currentValue: Number,
    created: Date,
    modified: Date
}); 

function assertCounterModelDefinition() : void
function assertCounterModelDefinition(counterModelName : string) : void
function assertCounterModelDefinition(counterModelName? : string) : void 
{
    let createDefinition = (ss : EMServiceSession) => {
        counterModelName = counterModelName || 'counter';
        ss.addUnconstrainedModelDefinition<CounterModel>(counterModelName, counterSchema); 
    };

    if (!EMServiceSession.instance) 
        EMServiceSession.on('serviceSessionConnected', () => createDefinition( EMServiceSession.instance ));
    else 
        createDefinition(EMServiceSession.instance);    
}

class CounterOperation 
{
    static increaseInstance(session: EMSession, id : any, options? : { quantity?: number, modelName? : string }) : Promise<CounterModel>
    {
        return new Promise<CounterModel>((resolve,reject)=>{
            let quantity = options && options.quantity != null ? options.quantity : 1;
            let modelName = options && options.modelName ? options.modelName : 'counter';
            let model = session.getUnconstrainedModel<CounterModel>(modelName);
            
            let update = { $inc: { currentValue: quantity }, modified: new Date() };
            model.findByIdAndUpdate( id, update, { new: true }, (err, updatedCounter) => {
                if (!err) 
                    resolve(updatedCounter);
                else
                    reject(err);
            });
        });
    }
    
    static createInstance(session : EMSession, counter : any, options? : { modelName?: string } ) : Promise<CounterModel>
    {
        let modelName = options && options.modelName ? options.modelName : 'counter';
        let model = session.getUnconstrainedModel<CounterModel>(modelName);
        return model.create(counter);
    }

    static getInstance(session : EMSession, conditions: any, options? : { modelName?: string } ) : Promise<CounterModel>
    {
        return new Promise<CounterModel>((resolve,reject)=> {
            let modelName = options && options.modelName ? options.modelName : 'counter';
            let model = session.getUnconstrainedModel<CounterModel>(modelName);
            model.find(conditions, (err, res) => {
                if (!err) {
                    let counter : CounterModel;
                    if (res && res.length >= 0)
                        counter = res[0];
                    resolve(counter);
                }
                else    
                    reject(err);
            });
        });
    }
}


export {
    CounterModel,
    counterSchema,
    assertCounterModelDefinition,
    CounterOperation
}




