
db = db.getSiblingDB("spotify");

//Завдання 1. Треки для вечірки
print("\n*******Завдання 1. Треки для вечірки********")

//Знайдіть треки, що підходять для вечірки. 
// Такі треки повинні мати високий danceability (вище 0.7) 
// та високу енергію (також вище 0.7), а тривалість — від 3 до 5 хвилин (180000–300000 мс)

printjson(
    db.tracks.find(
      {
        "audio_features.danceability":{$gt:0.7},
        "audio_features.energy":{$gt:0.7},
        duration_ms:{$gte:180000, $lte:300000}
      },
      {
        track_name:1,
        duration_ms:1,
        "audio_features.danceability":1,
        "audio_features.energy":1,
        _id:0
      }
    ).limit(20).toArray()
);

//Завдання 2. Виконавці, у яких усі треки популярні
print("\n*******Завдання 2. Виконавці, у яких усі треки популярні********")
//Вважатимемо артиста популярним, якщо у нього є мінімум 3 треки 
// і при цьому мінімальна популярність цих треків становить 60% або вище
//Знайдіть топ-20 таких артистів і виведіть для кожного ім’я артиста кількість треків, 
// мінімальну та середню популярність з точністю до одного знака після коми.

printjson(
    db.tracks.aggregate([
        {$unwind:"$artists"},

        {
            $group:{
                _id:{artist:"$artists", track_id:"$track_id"},
                popularity:{$max:"$popularity"}
            }
        },

        {
            $group:{
                _id:"$_id.artist",
                track_count:{$sum:1},
                min_popularity:{$min:"$popularity"},
                avg_popularity:{$avg:"$popularity"}
            }
        },

        {
            $match:{
                track_count:{$gte:3},
                min_popularity:{$gte:60}
            }
        },

        {$sort:{avg_popularity:-1}},
        {$limit: 20},

        {
            $project:{
                _id:0,
                artist:"$_id",
                track_count:1,
                min_popularity:{$round:["$min_popularity", 1]},
                avg_popularity:{$round:["$avg_popularity", 1]}
            }
        }
    ]).toArray()
);

//Завдання 3. Нетипові треки
print("\n*******Завдання 3. Нетипові треки********")
//Визначте треки з незвично високим темпом для їхнього жанру

printjson(
    db.tracks.aggregate([
        {
            $group:{
                _id:"$track_genre",
                avg_tempo:{$avg:"$audio_features.tempo"},
                std_tempo:{$stdDevPop:"$audio_features.tempo"},
                tracks:{
                    $push:{
                        _id:"$_id",
                        track_name:"$track_name",
                        popularity:"$popularity",
                        artists:"$artists",
                        audio_features:{ tempo:"$audio_features.tempo"}
                    }
                }
            }
        },

        {
            $addFields:{
                outlier_threshold:{$add:["$avg_tempo",{$multiply:[2, "$std_tempo"]}]}
            }
        },

        {
            $project:{
                _id:0,
                avg_tempo:{$round:["$avg_tempo", 1]},
                genre:"$_id",
                outlier_threshold:{$round:["$outlier_threshold", 1]},
                outlier_tracks:{
                    $filter:{
                        input:"$tracks",
                        as:"track",
                        cond:{$gt:["$$track.audio_features.tempo", "$outlier_threshold"]}
                    }
                }
            }
        },

        {$match:{outlier_tracks:{$ne:[]}}},

        {$sort:{genre:1}}
    ]).toArray()
);

//Завдання 4: Треки для фонової роботи
print("\n*******Завдання 4: Треки для фонової роботи********")
//тихі (loudness < -10), з низькою мовленнєвою складовою (speechiness < 0,1), 
// переважно інструментальні (instrumentalness > 0,5) і не містять explicit-контенту.

printjson(
    db.tracks.find(
        {
            "audio_features.loudness":{$lt:-10},
            "audio_features.speechiness":{$lt:0.1},
            "audio_features.instrumentalness":{$gt:0.5},
            explicit:false
        },
        {
            track_name:1,
            artists:1,
            explicit:1,
            "audio_features.loudness":1,
            "audio_features.speechiness":1,
            "audio_features.instrumentalness":1,
            _id:0
        }
    ).limit(20).toArray()
);