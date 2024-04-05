window.onload = function onload(){
	// 日付を取得
	var day = new Date(document.lastModified);
	var y = day.getFullYear();
	var m = day.getMonth() + 1;
	var d = day.getDate();

	//日にちの整形
	if (m < 10) m = "0" + m;
	if (d < 10) d = "0" + d;

	// last-updatedに出力
	var last_updated = document.getElementById('last-updated');
	last_updated.innerHTML = "最終更新：" + y + "/" + m + "/" + d;

	// var body = document.querySelector('body');
	// var fontsize = Math.max(window.innerWidth / 40, 14)
	// body.style.fontSize = fontsize + "px";
};

var ImasCg = (ImasCg ? ImasCg : {});
ImasCg.Ierukana = function () {

	var SITE_URL = 'https://natsumi-kan05.github.io/title/';

	var COMPARE_MODE_FLAG = {
		title: 1,
		title_kana: 2,
		first_name: 4,
		first_name_kana: 8,
		last_name: 16,
		last_name_kana: 32,
	};
	var MESSAGE = {
		'gameClear': 'ゲームクリア！',
		'alreadyAnswer': '解答済みの曲名です。',
		'notExist': '該当する曲名が見つかりません。',
	};

	var AGE_NUM = 7
	var AGE_ARRAY = Array(AGE_NUM).fill().map((e,i) => i+1); //[1,2,...,AGE_NUM]

	var COLUMNS_IN_ROW = 6;

	var numOfSongs = new Array(AGE_NUM+1).fill(0);
	var numOfRemains = new Array(AGE_NUM+1).fill(0);
	var titlesRemain = null

	var compare_mode = null;
	var difficulty = null;
	var startUnixTime = null;
	var clearCount = null;
	var lastSongName = null;

	var getSongById = function(id) {
		$.each(jsonData.songs, function(index, song) {
			if (song.id === id)
				return song;
		});
		return null;
	};

	var deleteSymbol = function(song) {
		var pattern = /[！-／：-＠［-｀｛-～、-〜“”’・×☆ -/:-@\[-`{-~]/g;
		var deleted = song.toLowerCase() // 小文字に揃える
		deleted = deleted.replace(/\(.+\)/g, "") // 括弧書きを削除
		deleted = deleted.replace(pattern, "") // 記号を削除
		deleted = deleted.replace(/[(x2)]+/g, "2") // x2, X2を削除
		deleted = deleted.replace("私立恵比寿中学の日常", "") // 蛍の光，早弁ラップ用
		return deleted
	}

	var getSongByName = function(name, compare_flags) {
		var result = [];
		$.each(jsonData.songs, function(index, song) {
			$.each(COMPARE_MODE_FLAG, function(key, compare_flag) {
				if (compare_flags & compare_flag) {
					if (deleteSymbol(song[key]) === deleteSymbol(name)) {
						result.push(song);
					}
				}
			});
		});
		return result;
	};

	var numOfAllSongsByAttribute = function (age) {
		var cnt = 0;
		$.each(jsonData.songs, function(index, song) {
			if (song.age === age)
				cnt++;
		});
		return cnt;
	};

	var updateSongsNum = function () {
		$('#num-of-answered').text(numOfSongs[0]-numOfRemains[0]);
		$.each(AGE_ARRAY, function(i, age) {
			var numOfAnswered = numOfSongs[age] - numOfRemains[age]
			$('#age' + age + '-songs span.remain')
				.text('（' + numOfAnswered + '曲／全' + numOfSongs[age]+ '曲）');
		});
	};

	var resetFormAtGameStart = function() {
		setDifficulty();

		numOfRemains = $.extend(true, {}, numOfSongs);
		$.each(AGE_ARRAY, function(i, age) { initTableByAttribute(age); });
		initNormalTable()
		updateSongsNum();
	};

	var resetFormAtGameEnd = function() {
		// 選択されていないラジオボタンをクリック可能にする
		var selectedRadio = $('input[name="difficulty-radio"]:checked');
		$('input[name="difficulty-radio"]').not(selectedRadio).prop('disabled', false);

		clearInterval(clearCount);
		$('#message-area').text('　');
		$('#answer-text').val('');
		$('#answer-text').hide();
		$('#answer-btn').hide();
		$('#giveup-btn').hide();
		$('#game-start-btn').show();
		$('#difficulty-show').text('');
	};

	var giveUp = function () {
		var confirmGiveUp = window.confirm('本当に降参しますか？');
		if (!confirmGiveUp){
			return
		}

		$.each(jsonData.songs, function(index, song) {
			if (! song.answered) {
				$('#' + song.id).addClass('giveUp').text(song.title);
			}
		});
		var numOfAnswered = numOfSongs[0] - numOfRemains[0]
		for(var i = 0; i < numOfRemains[0]; i++){
			$('#all' + (numOfAnswered+i)).addClass('giveUp').text(titlesRemain[i]);
		}
		resetFormAtGameEnd();
	};

	var gameClear = function () {
		alert(MESSAGE['gameClear']);
		resetFormAtGameEnd();
	};

	var gameStart = function () {
		// 選択されていないラジオボタンをクリック不可にする
		var selectedRadio = $('input[name="difficulty-radio"]:checked');
		$('input[name="difficulty-radio"]').not(selectedRadio).prop('disabled', true);

		$('#answer-text').show();
		$('#answer-btn').show();
		$('#giveup-btn').show();
		$('#game-start-btn').hide();
		startUnixTime = parseInt((new Date) / 1);
		clearCount = setInterval(function() { countUpStart(startUnixTime); }, 10);
	};

	var countUpStart = function () {
		var nextUnixTime = parseInt((new Date) / 1);
		var wTime = (nextUnixTime - startUnixTime) % 60000;
		var hour = (nextUnixTime - startUnixTime) / 3600000;
		var minute = (nextUnixTime - startUnixTime) / 60000;
		var second = (wTime / 1000);
		var milliSecond = Math.floor((second * 100)) % 100;
		second = Math.floor(second);
		minute = Math.floor(minute);
		hour = Math.floor(hour);

		$('#timer-area').html(hour + ':' + ('0' + minute).slice(-2) + ':' + ('0' + second).slice(-2) + '.' + ('0' + milliSecond).slice(-2));
	};

	var answerButtonSubmit = function () {
		var answer = $('#answer-text').val();

		var songsHitName = getSongByName(answer, compare_mode);
		if (songsHitName.length > 0) {
			var songsNotAnswered = songsHitName.filter(function(v){ return !v.answered; });
			if (songsNotAnswered.length > 0) {
				var song = songsNotAnswered[0];
				var title = song.title
				var idx = titlesRemain.indexOf(title)
				titlesRemain.splice(idx,1);
				$('#' + song.id).addClass('answered').text(song.title);
				$('#all' + (numOfSongs[0] - numOfRemains[0])).addClass('answered').text(title);
				song.answered = true;
				lastSongName = song.title;

				numOfRemains[0] -= 1;
				numOfRemains[song.age] -= 1;
				updateSongsNum();

				$('#answer-text').val('');
				$('#message-area').text('　');

				if (numOfRemains[0] == 0) {
					gameClear();
				}
			} else {
				$('#message-area').text(MESSAGE['alreadyAnswer']);
			}
		} else {
			$('#message-area').text(MESSAGE['notExist']);
		}
	};

	var gameStartButtonSubmit = function () {
		resetFormAtGameStart();
		gameStart();
	};

	var setDifficulty = function () {
		difficulty = $('input[name="difficulty-radio"]:checked').val();
		compare_mode = COMPARE_MODE_FLAG.title;
	};

	function sortByTitleKana(a, b) {
		const titleKanaA = a.title_kana;
		const titleKanaB = b.title_kana;
	  
		if (titleKanaA < titleKanaB) {
		  return -1;
		}
		if (titleKanaA > titleKanaB) {
		  return 1;
		}
		return 0;
	  }

	var initTableByAttribute = function (age) {
		var tableId = '#age' + age + '-songs';
		var numOfAnswered = numOfSongs[age] - numOfRemains[age]
		$(tableId + ' span.remain').text('（' + numOfAnswered + '曲／全' + numOfSongs[age]+ '曲）');
		$(tableId + ' tbody').html('');

		var $tr = $('<tr></tr>');
		var cnt = 0;
		var appendRow = function () {
			$(tableId + ' tbody').append($tr.clone());
			$tr = $('<tr></tr>');
			cnt = 0;
		};
		// 50音順にソートする
		jsonData.songs = jsonData.songs.sort(sortByTitleKana);
		$.each(jsonData.songs, function(index, song) {
			song.answered = false;
			if (song.age === age) {
				var $td = $('<td id="' + song.id + '">&nbsp;</td>');
				$tr.append($td.clone());
				cnt++;
				if (cnt == COLUMNS_IN_ROW) {
					appendRow();
				}
			}
		});
		if (cnt != 0) {
			appendRow();
		}
	};

	var initNormalTable = function () {
		var tableId = '#all-songs';
		$(tableId + ' tbody').html('');

		var $tr = $('<tr></tr>');
		var cnt = 0;
		var appendRow = function () {
			$(tableId + ' tbody').append($tr.clone());
			$tr = $('<tr></tr>');
			cnt = 0;
		};
		// 50音順にソートする
		jsonData.songs = jsonData.songs.sort(sortByTitleKana);
		$.each(jsonData.songs, function(index, song) {
			song.answered = false;
			var $td = $('<td id="all' + index + '">&nbsp;</td>');
			$tr.append($td.clone());
			cnt++;
			if (cnt == COLUMNS_IN_ROW) {
				appendRow();
			}
		});
		if (cnt != 0) {
			appendRow();
		}
	};

	return {

		init: function () {

			jsonData = null;

			var innerInit = function () {
				numOfSongs[0] = jsonData.songs.length;
				numOfRemains[0] = numOfSongs[0];
				$.each(AGE_ARRAY, function(i, age) {
					numOfSongs[age] = numOfAllSongsByAttribute(age);
					numOfRemains[age] = numOfSongs[age];
					initTableByAttribute(age);
				});
				initNormalTable();
				$('.numOfSong').text(numOfSongs[0]);
				$('#num-of-answered').text(0);
				$('#num-of-all').text(numOfSongs[0]);
				
				$('input[name="difficulty-radio"]').on('change', function() {
					console.log("a")
					$('#age-table-area').toggle()
					$('#all-table-area').toggle()
				});
				$('#answer-text').on('keypress', function(e) {
					if (e.which == 13) {
						answerButtonSubmit();
					}
				});
				$('#answer-btn').on('click', function() {
					answerButtonSubmit();
				});
				$('#game-start-btn').on('click', function() {
					gameStartButtonSubmit();
				});
				$('#giveup-btn').on('click', function() {
					giveUp();
				});
			};

			$.getJSON('data/songs.json').done(function(data) {
				jsonData = data;
				data = data.songs.sort(sortByTitleKana);
				titlesRemain = data.map(v => v.title);
				innerInit();
			}).fail(function(errorData) {
				$('#message-area').text('データ読み込みエラー');
			});

		}

	};
}();
$(function(){ ImasCg.Ierukana.init(); });
