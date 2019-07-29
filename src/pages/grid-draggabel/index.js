/**
 * Created by zhangsong on 2019-07-26.
 */


//All code created by Blake Bowen
//Forked from: https://codepen.io/osublake/pen/RNLdpz/

// GRID OPTIONS
var rowSize = 100;
var colSize = 100;
var gutter = 7;     // 瓷砖间距
var numTiles = 25;    // 最初填充网格的瓷砖数量
var fixedSize = false; // 如果为真，则每个瓷砖的柱距将固定为1
var oneColumn = false; // 如果为真，网格将只有1列，而瓷砖的固定跨距为1
var threshold = '50%'; // 这是检测碰撞所需的瓷砖之间的重叠量。

var $add = $('#add');
var $list = $('#list');
var $mode = $('input[name="layout"]');

// Live node list of tiles
var tiles = $list[0].getElementsByClassName('tile');
var label = 1;
var zIndex = 1000;

var startWidth = '100%';
var startSize = colSize;
var singleWidth = colSize * 3;

var colCount = null;
var rowCount = null;
var gutterStep = null;

var shadow1 = '0 1px 3px  0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.6)';
var shadow2 = '0 6px 10px 0 rgba(0, 0, 0, 0.3), 0 2px 2px 0 rgba(0, 0, 0, 0.2)';

// 当浏览器高度变化时执行该函数
$(window).resize(resize);
// 新增按钮点击时触发
$add.click(createTile);
// 当点击单选按钮,input的值变化时,触发该函数
$mode.change(init);

// 执行初始化函数
init();

// ========================================================================
//  INIT
// ========================================================================
function init() {

	var width = startWidth;

	// 此函数由单选按钮切换触发
	switch (this.value) {

	case 'mixed':
		fixedSize = false;
		oneColumn = false;
		colSize = startSize;
		break;

	case 'fixed':
		fixedSize = true;
		oneColumn = false;
		colSize = startSize;
		break;

	case 'column':
		fixedSize = false;
		oneColumn = true;
		width = singleWidth;
		colSize = singleWidth;
		break;
	}

	$('.tile').remove();
	// 改变宽度,有0.2秒的动画效果
	TweenLite.to($list, 0.2, { width: width });
	// 0.25秒后调用该函数
	TweenLite.delayedCall(0.25, populateBoard);

	function populateBoard() {

		label = 1;
		resize();

		for (var i = 0; i < numTiles; i++) {
			createTile();
		}
	}

}

// ========================================================================
//  页面大小改变事件
// ========================================================================
function resize() {

	colCount = oneColumn ? 1 : Math.floor($list.outerWidth() / (colSize + gutter));
	gutterStep = colCount == 1 ? gutter : (gutter * (colCount - 1) / colCount);
	rowCount = 0;

	layoutInvalidated();
}

// ========================================================================
//  CHANGE POSITION
// ========================================================================
function changePosition(from, to, rowToUpdate) {

	var $tiles = $('.tile');
	var insert = from > to ? 'insertBefore' : 'insertAfter';

	// Change DOM positions
	$tiles.eq(from)[insert]($tiles.eq(to));

	layoutInvalidated(rowToUpdate);
}

// ========================================================================
//  CREATE TILE
// ========================================================================
function createTile() {

	var colspan = fixedSize || oneColumn ? 1 : Math.floor(Math.random() * 2) + 1;
	var element = $('<div></div>').addClass('tile').html(label++);
	var lastX = 0;

	Draggable.create(element, {
		onDrag: onDrag,
		onPress: onPress,
		onRelease: onRelease,
		zIndexBoost: false,
	});

	//注意：保留rowspan设置为1，因为此演示
	//不计算不同的行高
	var tile = {
		col: null,
		colspan: colspan,
		element: element,
		height: 0,
		inBounds: true,
		index: null,
		isDragging: false,
		lastIndex: null,
		newTile: true,
		positioned: false,
		row: null,
		rowspan: 1,
		width: 0,
		x: 0,
		y: 0,
	};

	//向元素添加tile属性以快速查找
	element[0].tile = tile;

	$list.append(element);
	layoutInvalidated();

	function onPress() {

		lastX = this.x;
		tile.isDragging = true;
		tile.lastIndex = tile.index;

		TweenLite.to(element, 0.2, {
			autoAlpha: 0.75,
			boxShadow: shadow2,
			scale: 0.95,
			zIndex: '+=1000',
		});
	}

	function onDrag() {

		//如果不在边界内，则移动到列表结尾
		if (!this.hitTest($list, 0)) {
			tile.inBounds = false;
			changePosition(tile.index, tiles.length - 1);
			return;
		}

		tile.inBounds = true;

		for (var i = 0; i < tiles.length; i++) {

			// 要更新的行用于部分布局更新
			// 左/右移位检查是否正在拖动磁贴
			// 朝向正在测试的磁贴
			var testTile = tiles[i].tile;
			var onSameRow = (tile.row === testTile.row);
			var rowToUpdate = onSameRow ? tile.row : -1;
			var shiftLeft = onSameRow ? (this.x < lastX && tile.index > i) : true;
			var shiftRight = onSameRow ? (this.x > lastX && tile.index < i) : true;
			var validMove = (testTile.positioned && (shiftLeft || shiftRight));

			if (this.hitTest(tiles[i], threshold) && validMove) {
				changePosition(tile.index, i, rowToUpdate);
				break;
			}
		}

		lastX = this.x;
	}

	function onRelease() {

		//如果释放超出界限，则将平铺移回最后一个位置
		this.hitTest($list, 0)
			? layoutInvalidated()
			: changePosition(tile.index, tile.lastIndex);

		TweenLite.to(element, 0.2, {
			autoAlpha: 1,
			boxShadow: shadow1,
			scale: 1,
			x: tile.x,
			y: tile.y,
			zIndex: ++zIndex,
		});

		tile.isDragging = false;
	}
}

// ========================================================================
// 验证布局是否有效
// ========================================================================
function layoutInvalidated(rowToUpdate) {

	var timeline = new TimelineMax();
	var partialLayout = (rowToUpdate > -1);

	var height = 0;
	var col = 0;
	var row = 0;
	var time = 0.35;

	$('.tile').each(function (index, element) {

		var tile = this.tile;
		var oldRow = tile.row;
		var oldCol = tile.col;
		var newTile = tile.newTile;

		//部分布局：此条件只能在平铺
		//拖动。这样做的目的是只交换一行内的头寸，
		//如果一个空格
		//可用。如果没有这个，列0中可能会出现一个大的图块。
		//如果被一个较小的磁贴击中，并且
		//上面的行表示较小的图块。当用户停止拖动
		//平铺，将进行完整的布局更新，允许将平铺移动到
		//它们上方行中的可用空间。
		if (partialLayout) {
			row = tile.row;
			if (tile.row !== rowToUpdate) return;
		}

		// 超过colcount时更新跟踪程序
		if (col + tile.colspan > colCount) {
			col = 0;
			row++;
		}

		$.extend(tile, {
			col: col,
			row: row,
			index: index,
			x: col * gutterStep + (col * colSize),
			y: row * gutterStep + (row * rowSize),
			width: tile.colspan * colSize + ((tile.colspan - 1) * gutterStep),
			height: tile.rowspan * rowSize,
		});

		col += tile.colspan;

		//如果要拖动的图块在边界内，请设置一个新的
		//最后一个索引，以防超出界限
		if (tile.isDragging && tile.inBounds) {
			tile.lastIndex = index;
		}

		if (newTile) {

			// 清除新的平铺标志
			tile.newTile = false;

			var from = {
				autoAlpha: 0,
				boxShadow: shadow1,
				height: tile.height,
				scale: 0,
				width: tile.width,
			};

			var to = {
				autoAlpha: 1,
				scale: 1,
				zIndex: zIndex,
			};

			timeline.fromTo(element, time, from, to, 'reflow');
		}

		// 不要动画化正在拖动的瓷砖和
		// 仅对有更改的瓷砖设置动画
		if (!tile.isDragging && (oldRow !== tile.row || oldCol !== tile.col)) {

			var duration = newTile ? 0 : time;

			// 提高将要经过的瓷砖的Z索引
			// 由于行更改而导致的另一个图块
			if (oldRow !== tile.row) {
				timeline.set(element, { zIndex: ++zIndex }, 'reflow');
			}

			timeline.to(element, duration, {
				x: tile.x,
				y: tile.y,
				onComplete: function () { tile.positioned = true; },
				onStart: function () { tile.positioned = false; },
			}, 'reflow');
		}
	});

	// 如果行数已更改，请更改容器的高度
	if (row !== rowCount) {
		rowCount = row;
		height = rowCount * gutterStep + (++row * rowSize);
		timeline.to($list, 0.2, { height: height }, 'reflow');
	}
}

TweenLite.delayedCall(1, updateText);

function updateText() {
	$('.tile')[0].innerHTML = 'my message';
}


