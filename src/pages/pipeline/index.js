/**
 * Created by zhangsong on 2019-07-26.
 */

import { Draggable, TweenLite, CSSPlugin, AttrPlugin, TimelineMax } from 'gsap/all';
import $ from 'jquery';
import './index.scss';

//without this line, CSSPlugin and AttrPlugin may get dropped by your bundler...
// eslint-disable-next-line no-unused-vars
const plugins = [CSSPlugin, AttrPlugin];

const $draggable = document.querySelector('#draggable-wrapper');
// 允许的布局元素
const $layout = document.querySelector('#layout-area');
// 准备区域
const $optionsLayout = document.querySelector('#options-area');
// 布局宽度
let layoutWidth = 800;
// 布局高度
let layoutHeight = 400;
// 超过这个值则算重叠
var threshold = '10%';
// 初始层叠
var zIndex = 1000;

var shadow1 = '0 1px 3px  0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.6)';
var shadow2 = '0 6px 10px 0 rgba(0, 0, 0, 0.3), 0 2px 2px 0 rgba(0, 0, 0, 0.2)';

var rowSize = 100;
var colSize = 100;
var colCount = 10;
var gutter = 7;
var rowCount = 1;

/**
 * 判断布局是否有错误
 * @param rowToUpdate
 */
function layoutInvalidated(rowToUpdate) {

  var timeline = new TimelineMax();
  var partialLayout = (rowToUpdate > -1);

  var height = 0;
  var col = 0;
  var row = 0;
  var time = 0.35;
  const gutterStep = (gutter * (colCount - 1) / colCount);

  $('.item-wrapper').each(function (index, element) {

    var tile = this.tile;
    var oldRow = tile.row;
    var oldCol = tile.col;
    var newTile = tile.newTile;

    // PARTIAL LAYOUT: This condition can only occur while a tile is being
    // dragged. The purpose of this is to only swap positions within a row,
    // which will prevent a tile from jumping to another row if a space
    // is available. Without this, a large tile in column 0 may appear
    // to be stuck if hit by a smaller tile, and if there is space in the
    // row above for the smaller tile. When the user stops dragging the
    // tile, a full layout update will happen, allowing tiles to move to
    // available spaces in rows above them.
    if (partialLayout) {
      row = tile.row;
      if (tile.row !== rowToUpdate) return;
    }

    // Update trackers when colCount is exceeded
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

    // If the tile being dragged is in bounds, set a new
    // last index in case it goes out of bounds
    if (tile.isDragging && tile.inBounds) {
      tile.lastIndex = index;
    }

    if (newTile) {

      // Clear the new tile flag
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

    // Don't animate the tile that is being dragged and
    // only animate the tiles that have changes
    if (!tile.isDragging && (oldRow !== tile.row || oldCol !== tile.col)) {

      var duration = newTile ? 0 : time;

      // Boost the z-index for tiles that will travel over
      // another tile due to a row change
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

  if (!row) rowCount = 1;

  // If the row count has changed, change the height of the container
  if (row !== rowCount) {
    rowCount = row;
    height = rowCount * gutterStep + (++row * rowSize);
    timeline.to($draggable, 0.2, { height: height }, 'reflow');
  }
}

/**
 * 改变元素位置
 * @param from 原来位置(数组中下标)
 * @param to 改变后位置(数组中下标)
 * @param rowToUpdate
 */
function changePosition(from, to, rowToUpdate) {
  var $tiles = $('.item-wrapper');
  var insert = from > to ? 'insertBefore' : 'insertAfter';

  // Change DOM positions
  $tiles.eq(from)[insert]($tiles.eq(to));

  layoutInvalidated(rowToUpdate);
}

// 删除元素
function removeGrid(grid) {
  const drag = Draggable.get(grid);
  if (drag) {
    drag.kill();
  }
  const parent = grid.parentNode;
  parent.removeChild(grid);
}

// 新增一个元素
function createGrid() {
  const element = document.createElement('div');
  element.innerHTML = '<div class="item-draggable"></div><div class="item-name centered">机器1</div>';
  // 最后的x坐标
  let lastX = 0;
  // 创建对应的拖动事件
  Draggable.create(element, {
    onDrag: onDrag,
    onPress: onPress,
    onRelease: onRelease,
    zIndexBoost: false,
  });

  // 此为演示,不计算不同的行高
  var tile = {
    col: null,
    colspan: 1,
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

  // 向元素添加tile属性以快速查找
  element.grid = tile;
  // 添加到页面中
  $optionsLayout.appendChild(element);
  // 计算布局是否无效
  //	layoutInvalidated();

  // 按下事件
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

  // 拖动事件
  function onDrag() {
    const tiles = $optionsLayout.querySelectorAll('.item-wrapper');
    // 如果不在边界内，则移动到列表结尾
    if (!this.hitTest($draggable, 0)) {
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

  // 释放事件
  function onRelease() {

    // 如果释放超出界限，则将平铺移回最后一个位置
    this.hitTest($draggable, 0)
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

// 初始化
function init() {
  // 设置宽高
  TweenLite.to($layout, 0.2, { width: layoutWidth + 'px', height: layoutHeight + 'px' });
  //	TweenLite.delayedCall(0.25, populateBoard);

  // 删除全部元素
  const elmArr = document.querySelectorAll('.options-area .item-wrapper');
  for (let i = 0; i < elmArr.length; i++) {
    removeGrid(elmArr[i]);
  }
  createGrid();
  createGrid();
  createGrid();
}

window.onload = function () {
  init();
//
//	var lockZone = document.querySelector('.room-area');
//
//	Draggable.create('.item-wrapper', {
//		activeCursor: 'move',
//		cursor: 'grabbing',
//		type: 'x,y',
//		// 不允许拖出边界
//		edgeResistance: 1,
//		// 边界元素
//		bounds: document.querySelector('#draggable-wrapper'),
//		trigger: '.item-draggable',
//		liveSnap: {
//			points: myModifier,
//		},
//	});
//
//	function myModifier(point) {
//		//make the target render at the spot immediately so that we can accurately measure the getBoundingClientRect() as if it had moved there.
//		TweenLite.set(this.target, { x: point.x, y: point.y, immediateRender: true });
//
//		var targetBounds = this.target.getBoundingClientRect(),
//			avoidBounds = lockZone.getBoundingClientRect(),
//			x = point.x,
//			y = point.y,
//			horizontalOverlap = (targetBounds.right > avoidBounds.left && targetBounds.left < avoidBounds.right),
//			verticalOverlap = (targetBounds.bottom > avoidBounds.top && targetBounds.top < avoidBounds.bottom),
//			targetCenterX, targetCenterY;
//		var distanceToLeft, distanceToRight, distanceToTop, distanceToBottom;
//		//only run this logic if there's overlap on both the vertical and horizontal axis...
//		if (horizontalOverlap && verticalOverlap) {
//			//figure out the center of the target as well as the element we're avoiding...
//			targetCenterX = (targetBounds.left + targetBounds.right) / 2;
//			targetCenterY = (targetBounds.top + targetBounds.bottom) / 2;
//
//			//calculate the distance to each edge so that we can find the closest one to snap to
//			distanceToLeft = Math.abs(targetCenterX - avoidBounds.left);
//			distanceToRight = Math.abs(avoidBounds.right - targetCenterX);
//			distanceToTop = Math.abs(targetCenterY - avoidBounds.top);
//			distanceToBottom = Math.abs(avoidBounds.bottom - targetCenterY);
//
//			//adjust for outer edges
//			if (targetCenterX < avoidBounds.left) {
//				distanceToTop += distanceToLeft;
//				distanceToBottom += distanceToLeft;
//			} else if (targetCenterX > avoidBounds.right) {
//				distanceToTop += distanceToRight;
//				distanceToBottom += distanceToRight;
//			}
//			if (targetCenterY < avoidBounds.top) {
//				distanceToLeft += distanceToTop;
//				distanceToRight += distanceToTop;
//			} else if (targetCenterY > avoidBounds.bottom) {
//				distanceToLeft += distanceToBottom;
//				distanceToRight += distanceToBottom;
//			}
//
//			//snap to the appropriate side
//			switch (Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom)) {
//			case distanceToLeft:
//				x -= (targetBounds.right - avoidBounds.left);
//				break;
//			case distanceToRight:
//				x += (avoidBounds.right - targetBounds.left);
//				break;
//			case distanceToTop:
//				y -= (targetBounds.bottom - avoidBounds.top);
//				break;
//			case distanceToBottom:
//				y += (avoidBounds.bottom - targetBounds.top);
//				break;
//			}
//		}
//		TweenLite.set(this.target, { x: x, y: y });
//		return { x: x, y: y };
//	}
};

