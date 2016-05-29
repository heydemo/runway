import Parse from 'parse/node';

let query_results = JSON.parse(`[{"bliss_id":"WCqW1pkr5w2DbvQJ","class_name":"Exercise","createTime":1462220478,"createdAt":"2016-05-02T20:22:30.172Z","exercise_class":"GratitudeExercise","responses":{"gratitude":"Test 1"},"savedToParseTime":1462220550.149,"updateTime":1462220546,"updatedAt":"2016-05-02T20:22:30.172Z","version_id":"E7fAfteMN8hnXECC","objectId":"raYHcSc3Kf"},{"bliss_id":"jWSd8BZ6w3TwXvFY","class_name":"Exercise","createTime":1462220567,"createdAt":"2016-05-02T20:22:52.647Z","exercise_class":"GratitudeExercise","responses":{"gratitude":"Test 2"},"savedToParseTime":1462220572.643,"updateTime":1462220570,"updatedAt":"2016-05-02T20:22:52.647Z","version_id":"86DLk0yanZDDm9SG","objectId":"H4vceHSEwY"},{"bliss_id":"7cACGZ60XNaobE0p","class_name":"Exercise","createTime":1462220600,"createdAt":"2016-05-02T20:23:26.173Z","exercise_class":"GratitudeExercise","responses":{"gratitude":"Test 3"},"savedToParseTime":1462220606.177,"updateTime":1462220604,"updatedAt":"2016-05-02T20:23:26.173Z","version_id":"uLXUHjHKAl5rSwto","objectId":"73CwCC9eFE"},{"bliss_id":"jWSd8BZ6w3TwXvFY","class_name":"Exercise","createTime":1462220567,"createdAt":"2016-05-02T20:24:26.181Z","exercise_class":"GratitudeExercise","responses":{"gratitude":"Test 2 [Edited]"},"savedToParseTime":1462220666.175,"updateTime":1462220663,"updatedAt":"2016-05-02T20:24:26.181Z","version_id":"lw7pXcAq01kwjLsS","objectId":"YG58MwUHdw"},{"bliss_id":"7cACGZ60XNaobE0p","class_name":"Exercise","createTime":1462220600,"createdAt":"2016-05-02T21:25:29.195Z","exercise_class":"GratitudeExercise","responses":{"gratitude":"Test 3"},"savedToParseTime":1462224329.192,"updateTime":1462220604,"updatedAt":"2016-05-02T21:25:29.195Z","version_id":"o5muvsp6XRA3Ap8r","objectId":"BFwYrygrdk"},{"bliss_id":"jWSd8BZ6w3TwXvFY","class_name":"Exercise","createTime":1462220567,"createdAt":"2016-05-02T21:25:29.198Z","exercise_class":"GratitudeExercise","responses":{"gratitude":"Test 2 [Edited]"},"savedToParseTime":1462224329.195,"updateTime":1462220663,"updatedAt":"2016-05-02T21:25:29.198Z","version_id":"G1wFviNCH6jBTOIs","objectId":"wwu7pgpkHo"},{"bliss_id":"WCqW1pkr5w2DbvQJ","class_name":"Exercise","createTime":1462220478,"createdAt":"2016-05-02T21:25:29.202Z","exercise_class":"GratitudeExercise","responses":{"gratitude":"Test 1"},"savedToParseTime":1462224329.199,"updateTime":1462220546,"updatedAt":"2016-05-02T21:25:29.202Z","version_id":"HFbTW5VMYv881rzg","objectId":"89c8yr1wsK"},{"bliss_id":"jWSd8BZ6w3TwXvFY","class_name":"Exercise","createTime":1462220567,"createdAt":"2016-05-02T21:25:29.216Z","exercise_class":"GratitudeExercise","responses":{"gratitude":"Test 2"},"savedToParseTime":1462224329.211,"updateTime":1462220570,"updatedAt":"2016-05-02T21:25:29.216Z","version_id":"cM5jjFJ8oX1zAGBZ","objectId":"e4IA65NEMh"}]`);

let ExerciseClass = Parse.Object.extend('Exercise');

query_results = query_results.map((result) => {
  result.responses = [result.responses];
  return new ExerciseClass(result);
});

export default query_results;