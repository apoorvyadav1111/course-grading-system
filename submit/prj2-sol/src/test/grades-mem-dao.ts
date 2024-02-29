import { GradesDao, makeGradesDao } from '../lib/grades-dao.js';

import { MongoMemoryServer } from 'mongodb-memory-server';

import { assert } from 'chai';


interface WrappedDao {
  mongod: MongoMemoryServer;
};

export default class MemGradesDao {
  
  static async setup() : Promise<GradesDao> {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    assert(mongod.instanceInfo, `mongo memory server startup failed`);
    const daoResult = await makeGradesDao(uri);
    if (!daoResult.isOk) throw daoResult;
    const dao = daoResult.val;
    ((dao as unknown) as WrappedDao).mongod = mongod;
    return dao;
  }

  static async tearDown(dao: GradesDao) {
    await dao.close();
    const mongod = ((dao as unknown) as WrappedDao).mongod;
    await mongod.stop();
    assert.equal(mongod.instanceInfo, undefined,
		 `mongo memory server stop failed`);
  }
}
