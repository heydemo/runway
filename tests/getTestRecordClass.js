
import t from 'tcomb';
import { Model } from '../src/index.js';

export default function getTestRecordClass() {
  let m = Model({
      bliss_id:  t.String,
      responses: t.list(t.Object),
      createTime: t.Number,
      updateTime: t.Number,
    }, { name: 'Exercise', index: 'bliss_id'});

    return m;
}

export function getTestRecords() {
  let test_records = [];
  let RecordClass = getTestRecordClass();
  test_records.push(new RecordClass({ bliss_id: 'abc', responses: [ { bbb: 'blah blah blah' } ]})); 
  test_records.push(new RecordClass({ bliss_id: '321', responses: [ { gratitude: 'I real grateful' } ]})); 
  test_records.push(new RecordClass({ bliss_id: 'zzz', responses: [ { gratitude: 'Grateful for Test Driven Development' } ]})); 

  return test_records;
}

export function logTestError(test_description) {
  return (error) => {
    console.log(`Error in ${test_description}`);
    console.log(error);
    return error;
  }
}
