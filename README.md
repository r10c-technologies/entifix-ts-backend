# Description

Entifix is in short terms, the very first step in the road of building a new *TypeScript* framework for *Nodejs* backend applications. The main idea is that the developers should only worry about create entities and their business behavior. All the logic for REST exposition and communication between microservices should be a standard or convention.

In other words, you ounly declare an entity using a ```class``` and then you have CRUD operations, retrieve pagination, filtering and standar communication through AMQP.

## Integrations

Entifx use the following technologies to work:

- Mongoose for MongoDB persistence
- ExpressJS for HTTP exposition
- RabbitMQ for microservices communication
- Redis for microservices data

<br/>

# Installation

> npm install --save entifix-ts-backend

<br/>

# Single Entity

For example, if you would like to build an entity call **Brand** with  **name** and **country** properties and accessors:

```
class Brand
{
  #region Properties

  private _name: string;
  private _country: string

  #region

  #region Accessors

  get name() {
    return this._name;
  }
  set name(value) {
    this._name = value;
  }

  get country() {
    return this._country;
  }
  set country(value) {
    this._country = value;
  }

  #endregion
}
```
We only use annotations imported from **entifix-ts-backend**

```
import {
   EMEntity,
   EntityDocument,
   ExpositionType,
   DefinedAccessor,
   DefinedEntity
} from "entifix-ts-backend";

interface IBrand {
   name: string;
   country: string;
}
interface IBrandModel extends EntityDocument, IBrand { }
@DefinedEntity()
class Brand extends EMEntity implements IBrand
{
   //#region Properties
   //#endregion

   //#region Methods

   //#endregion

   //#region Accessors

   @DefinedAccessor({
      exposition: ExpositionType.Normal, schema: { type: String }
   })
   get name() : string
   { return (this._document as IBrandModel).name; }
   set name(value : string)
   { (this._document as IBrandModel).name = value; }

   @DefinedAccessor({
      exposition: ExpositionType.Normal, schema: { type: String }
   })
   get country() : string
   { return (this._document as IBrandModel).country; }
   set country(value : string)
   { (this._document as IBrandModel).country = value; }

   //#endregion
}
export {
   IBrand,
   IBrandModel,
   Brand
}
```

<br/>

# Step by Step

You can follow the step by step in the [Hello World Entifix](https://medium.com/the-innovation/the-first-entifix-application-4bda3776950f) post.



