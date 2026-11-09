(() => {
  // apps/ios/EditorModel/node_modules/orderedmap/dist/index.js
  function OrderedMap(content) {
    this.content = content;
  }
  OrderedMap.prototype = {
    constructor: OrderedMap,
    find: function(key) {
      for (var i = 0;i < this.content.length; i += 2)
        if (this.content[i] === key)
          return i;
      return -1;
    },
    get: function(key) {
      var found = this.find(key);
      return found == -1 ? undefined : this.content[found + 1];
    },
    update: function(key, value, newKey) {
      var self = newKey && newKey != key ? this.remove(newKey) : this;
      var found = self.find(key), content = self.content.slice();
      if (found == -1) {
        content.push(newKey || key, value);
      } else {
        content[found + 1] = value;
        if (newKey)
          content[found] = newKey;
      }
      return new OrderedMap(content);
    },
    remove: function(key) {
      var found = this.find(key);
      if (found == -1)
        return this;
      var content = this.content.slice();
      content.splice(found, 2);
      return new OrderedMap(content);
    },
    addToStart: function(key, value) {
      return new OrderedMap([key, value].concat(this.remove(key).content));
    },
    addToEnd: function(key, value) {
      var content = this.remove(key).content.slice();
      content.push(key, value);
      return new OrderedMap(content);
    },
    addBefore: function(place, key, value) {
      var without = this.remove(key), content = without.content.slice();
      var found = without.find(place);
      content.splice(found == -1 ? content.length : found, 0, key, value);
      return new OrderedMap(content);
    },
    forEach: function(f) {
      for (var i = 0;i < this.content.length; i += 2)
        f(this.content[i], this.content[i + 1]);
    },
    prepend: function(map) {
      map = OrderedMap.from(map);
      if (!map.size)
        return this;
      return new OrderedMap(map.content.concat(this.subtract(map).content));
    },
    append: function(map) {
      map = OrderedMap.from(map);
      if (!map.size)
        return this;
      return new OrderedMap(this.subtract(map).content.concat(map.content));
    },
    subtract: function(map) {
      var result = this;
      map = OrderedMap.from(map);
      for (var i = 0;i < map.content.length; i += 2)
        result = result.remove(map.content[i]);
      return result;
    },
    toObject: function() {
      var result = {};
      this.forEach(function(key, value) {
        result[key] = value;
      });
      return result;
    },
    get size() {
      return this.content.length >> 1;
    }
  };
  OrderedMap.from = function(value) {
    if (value instanceof OrderedMap)
      return value;
    var content = [];
    if (value)
      for (var prop in value)
        content.push(prop, value[prop]);
    return new OrderedMap(content);
  };
  var dist_default = OrderedMap;

  // apps/ios/EditorModel/node_modules/prosemirror-model/dist/index.js
  function findDiffStart(a, b, pos) {
    for (let i = 0;; i++) {
      if (i == a.childCount || i == b.childCount)
        return a.childCount == b.childCount ? null : pos;
      let childA = a.child(i), childB = b.child(i);
      if (childA == childB) {
        pos += childA.nodeSize;
        continue;
      }
      if (!childA.sameMarkup(childB))
        return pos;
      if (childA.isText && childA.text != childB.text) {
        let tA = childA.text, tB = childB.text, j = 0;
        for (;tA[j] == tB[j]; j++)
          pos++;
        if (j && j < tA.length && j < tB.length && surrogateHigh(tA.charCodeAt(j - 1)) && surrogateLow(tA.charCodeAt(j)))
          pos--;
        return pos;
      }
      if (childA.content.size || childB.content.size) {
        let inner = findDiffStart(childA.content, childB.content, pos + 1);
        if (inner != null)
          return inner;
      }
      pos += childA.nodeSize;
    }
  }
  function findDiffEnd(a, b, posA, posB) {
    for (let iA = a.childCount, iB = b.childCount;; ) {
      if (iA == 0 || iB == 0)
        return iA == iB ? null : { a: posA, b: posB };
      let childA = a.child(--iA), childB = b.child(--iB), size = childA.nodeSize;
      if (childA == childB) {
        posA -= size;
        posB -= size;
        continue;
      }
      if (!childA.sameMarkup(childB))
        return { a: posA, b: posB };
      if (childA.isText && childA.text != childB.text) {
        let tA = childA.text, tB = childB.text, iA2 = tA.length, iB2 = tB.length;
        while (iA2 > 0 && iB2 > 0 && tA[iA2 - 1] == tB[iB2 - 1]) {
          iA2--;
          iB2--;
          posA--;
          posB--;
        }
        if (iA2 && iB2 && iA2 < tA.length && surrogateHigh(tA.charCodeAt(iA2 - 1)) && surrogateLow(tA.charCodeAt(iA2))) {
          posA++;
          posB++;
        }
        return { a: posA, b: posB };
      }
      if (childA.content.size || childB.content.size) {
        let inner = findDiffEnd(childA.content, childB.content, posA - 1, posB - 1);
        if (inner)
          return inner;
      }
      posA -= size;
      posB -= size;
    }
  }
  function surrogateLow(ch) {
    return ch >= 56320 && ch < 57344;
  }
  function surrogateHigh(ch) {
    return ch >= 55296 && ch < 56320;
  }

  class Fragment {
    constructor(content, size) {
      this.content = content;
      this.size = size || 0;
      if (size == null)
        for (let i = 0;i < content.length; i++)
          this.size += content[i].nodeSize;
    }
    nodesBetween(from, to, f, nodeStart = 0, parent) {
      for (let i = 0, pos = 0;pos < to; i++) {
        let child = this.content[i], end = pos + child.nodeSize;
        if (end > from && f(child, nodeStart + pos, parent || null, i) !== false && child.content.size) {
          let start = pos + 1;
          child.nodesBetween(Math.max(0, from - start), Math.min(child.content.size, to - start), f, nodeStart + start);
        }
        pos = end;
      }
    }
    descendants(f) {
      this.nodesBetween(0, this.size, f);
    }
    textBetween(from, to, blockSeparator, leafText) {
      let text = "", first = true;
      this.nodesBetween(from, to, (node, pos) => {
        let nodeText = node.isText ? node.text.slice(Math.max(from, pos) - pos, to - pos) : !node.isLeaf ? "" : leafText ? typeof leafText === "function" ? leafText(node) : leafText : node.type.spec.leafText ? node.type.spec.leafText(node) : "";
        if (node.isBlock && (node.isLeaf && nodeText || node.isTextblock) && blockSeparator) {
          if (first)
            first = false;
          else
            text += blockSeparator;
        }
        text += nodeText;
      }, 0);
      return text;
    }
    append(other) {
      if (!other.size)
        return this;
      if (!this.size)
        return other;
      let last = this.lastChild, first = other.firstChild, content = this.content.slice(), i = 0;
      if (last.isText && last.sameMarkup(first)) {
        content[content.length - 1] = last.withText(last.text + first.text);
        i = 1;
      }
      for (;i < other.content.length; i++)
        content.push(other.content[i]);
      return new Fragment(content, this.size + other.size);
    }
    cut(from, to = this.size) {
      if (from == 0 && to == this.size)
        return this;
      let result = [], size = 0;
      if (to > from)
        for (let i = 0, pos = 0;pos < to; i++) {
          let child = this.content[i], end = pos + child.nodeSize;
          if (end > from) {
            if (pos < from || end > to) {
              if (child.isText)
                child = child.cut(Math.max(0, from - pos), Math.min(child.text.length, to - pos));
              else
                child = child.cut(Math.max(0, from - pos - 1), Math.min(child.content.size, to - pos - 1));
            }
            result.push(child);
            size += child.nodeSize;
          }
          pos = end;
        }
      return new Fragment(result, size);
    }
    cutByIndex(from, to) {
      if (from == to)
        return Fragment.empty;
      if (from == 0 && to == this.content.length)
        return this;
      return new Fragment(this.content.slice(from, to));
    }
    replaceChild(index, node) {
      let current = this.content[index];
      if (current == node)
        return this;
      let copy = this.content.slice();
      let size = this.size + node.nodeSize - current.nodeSize;
      copy[index] = node;
      return new Fragment(copy, size);
    }
    addToStart(node) {
      return new Fragment([node].concat(this.content), this.size + node.nodeSize);
    }
    addToEnd(node) {
      return new Fragment(this.content.concat(node), this.size + node.nodeSize);
    }
    eq(other) {
      if (this.content.length != other.content.length)
        return false;
      for (let i = 0;i < this.content.length; i++)
        if (!this.content[i].eq(other.content[i]))
          return false;
      return true;
    }
    get firstChild() {
      return this.content.length ? this.content[0] : null;
    }
    get lastChild() {
      return this.content.length ? this.content[this.content.length - 1] : null;
    }
    get childCount() {
      return this.content.length;
    }
    child(index) {
      let found = this.content[index];
      if (!found)
        throw new RangeError("Index " + index + " out of range for " + this);
      return found;
    }
    maybeChild(index) {
      return this.content[index] || null;
    }
    forEach(f) {
      for (let i = 0, p = 0;i < this.content.length; i++) {
        let child = this.content[i];
        f(child, p, i);
        p += child.nodeSize;
      }
    }
    findDiffStart(other, pos = 0) {
      return findDiffStart(this, other, pos);
    }
    findDiffEnd(other, pos = this.size, otherPos = other.size) {
      return findDiffEnd(this, other, pos, otherPos);
    }
    findIndex(pos) {
      if (pos == 0)
        return retIndex(0, pos);
      if (pos == this.size)
        return retIndex(this.content.length, pos);
      if (pos > this.size || pos < 0)
        throw new RangeError(`Position ${pos} outside of fragment (${this})`);
      for (let i = 0, curPos = 0;; i++) {
        let cur = this.child(i), end = curPos + cur.nodeSize;
        if (end >= pos) {
          if (end == pos)
            return retIndex(i + 1, end);
          return retIndex(i, curPos);
        }
        curPos = end;
      }
    }
    toString() {
      return "<" + this.toStringInner() + ">";
    }
    toStringInner() {
      return this.content.join(", ");
    }
    toJSON() {
      return this.content.length ? this.content.map((n) => n.toJSON()) : null;
    }
    static fromJSON(schema, value) {
      if (!value)
        return Fragment.empty;
      if (!Array.isArray(value))
        throw new RangeError("Invalid input for Fragment.fromJSON");
      return Fragment.fromArray(value.map(schema.nodeFromJSON));
    }
    static fromArray(array) {
      if (!array.length)
        return Fragment.empty;
      let joined, size = 0;
      for (let i = 0;i < array.length; i++) {
        let node = array[i];
        size += node.nodeSize;
        if (i && node.isText && array[i - 1].sameMarkup(node)) {
          if (!joined)
            joined = array.slice(0, i);
          joined[joined.length - 1] = node.withText(joined[joined.length - 1].text + node.text);
        } else if (joined) {
          joined.push(node);
        }
      }
      return new Fragment(joined || array, size);
    }
    static from(nodes) {
      if (!nodes)
        return Fragment.empty;
      if (nodes instanceof Fragment)
        return nodes;
      if (Array.isArray(nodes))
        return this.fromArray(nodes);
      if (nodes.attrs)
        return new Fragment([nodes], nodes.nodeSize);
      throw new RangeError("Can not convert " + nodes + " to a Fragment" + (nodes.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
    }
  }
  Fragment.empty = new Fragment([], 0);
  var found = { index: 0, offset: 0 };
  function retIndex(index, offset) {
    found.index = index;
    found.offset = offset;
    return found;
  }
  function compareDeep(a, b) {
    if (a === b)
      return true;
    if (!(a && typeof a == "object") || !(b && typeof b == "object"))
      return false;
    let array = Array.isArray(a);
    if (Array.isArray(b) != array)
      return false;
    if (array) {
      if (a.length != b.length)
        return false;
      for (let i = 0;i < a.length; i++)
        if (!compareDeep(a[i], b[i]))
          return false;
    } else {
      for (let p in a)
        if (!(p in b) || !compareDeep(a[p], b[p]))
          return false;
      for (let p in b)
        if (!(p in a))
          return false;
    }
    return true;
  }

  class Mark {
    constructor(type, attrs) {
      this.type = type;
      this.attrs = attrs;
    }
    addToSet(set) {
      let copy, placed = false;
      for (let i = 0;i < set.length; i++) {
        let other = set[i];
        if (this.eq(other))
          return set;
        if (this.type.excludes(other.type)) {
          if (!copy)
            copy = set.slice(0, i);
        } else if (other.type.excludes(this.type)) {
          return set;
        } else {
          if (!placed && other.type.rank > this.type.rank) {
            if (!copy)
              copy = set.slice(0, i);
            copy.push(this);
            placed = true;
          }
          if (copy)
            copy.push(other);
        }
      }
      if (!copy)
        copy = set.slice();
      if (!placed)
        copy.push(this);
      return copy;
    }
    removeFromSet(set) {
      for (let i = 0;i < set.length; i++)
        if (this.eq(set[i]))
          return set.slice(0, i).concat(set.slice(i + 1));
      return set;
    }
    isInSet(set) {
      for (let i = 0;i < set.length; i++)
        if (this.eq(set[i]))
          return true;
      return false;
    }
    eq(other) {
      return this == other || this.type == other.type && compareDeep(this.attrs, other.attrs);
    }
    toJSON() {
      let obj = { type: this.type.name };
      for (let _ in this.attrs) {
        obj.attrs = this.attrs;
        break;
      }
      return obj;
    }
    static fromJSON(schema, json) {
      if (!json)
        throw new RangeError("Invalid input for Mark.fromJSON");
      let type = schema.marks[json.type];
      if (!type)
        throw new RangeError(`There is no mark type ${json.type} in this schema`);
      let mark = type.create(json.attrs);
      return mark;
    }
    static sameSet(a, b) {
      if (a == b)
        return true;
      if (a.length != b.length)
        return false;
      for (let i = 0;i < a.length; i++)
        if (!a[i].eq(b[i]))
          return false;
      return true;
    }
    static setFrom(marks) {
      if (!marks || Array.isArray(marks) && marks.length == 0)
        return Mark.none;
      if (marks instanceof Mark)
        return [marks];
      let copy = marks.slice();
      copy.sort((a, b) => a.type.rank - b.type.rank);
      return copy;
    }
  }
  Mark.none = [];

  class ReplaceError extends Error {
  }

  class Slice {
    constructor(content, openStart, openEnd) {
      this.content = content;
      this.openStart = openStart;
      this.openEnd = openEnd;
    }
    get size() {
      return this.content.size - this.openStart - this.openEnd;
    }
    insertAt(pos, fragment) {
      let content = insertInto(this.content, pos + this.openStart, fragment, this.openStart + 1, this.openEnd + 1);
      return content && new Slice(content, this.openStart, this.openEnd);
    }
    removeBetween(from, to) {
      return new Slice(removeRange(this.content, from + this.openStart, to + this.openStart), this.openStart, this.openEnd);
    }
    eq(other) {
      return this.content.eq(other.content) && this.openStart == other.openStart && this.openEnd == other.openEnd;
    }
    toString() {
      return this.content + "(" + this.openStart + "," + this.openEnd + ")";
    }
    toJSON() {
      if (!this.content.size)
        return null;
      let json = { content: this.content.toJSON() };
      if (this.openStart > 0)
        json.openStart = this.openStart;
      if (this.openEnd > 0)
        json.openEnd = this.openEnd;
      return json;
    }
    static fromJSON(schema, json) {
      if (!json)
        return Slice.empty;
      let openStart = json.openStart || 0, openEnd = json.openEnd || 0;
      if (typeof openStart != "number" || typeof openEnd != "number")
        throw new RangeError("Invalid input for Slice.fromJSON");
      return new Slice(Fragment.fromJSON(schema, json.content), openStart, openEnd);
    }
    static maxOpen(fragment, openIsolating = true) {
      let openStart = 0, openEnd = 0;
      for (let n = fragment.firstChild;n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.firstChild)
        openStart++;
      for (let n = fragment.lastChild;n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.lastChild)
        openEnd++;
      return new Slice(fragment, openStart, openEnd);
    }
  }
  Slice.empty = new Slice(Fragment.empty, 0, 0);
  function removeRange(content, from, to) {
    let { index, offset } = content.findIndex(from), child = content.maybeChild(index);
    let { index: indexTo, offset: offsetTo } = content.findIndex(to);
    if (offset == from || child.isText) {
      if (offsetTo != to && !content.child(indexTo).isText)
        throw new RangeError("Removing non-flat range");
      return content.cut(0, from).append(content.cut(to));
    }
    if (index != indexTo)
      throw new RangeError("Removing non-flat range");
    return content.replaceChild(index, child.copy(removeRange(child.content, from - offset - 1, to - offset - 1)));
  }
  function insertInto(content, dist, insert, openStart, openEnd, parent) {
    let { index, offset } = content.findIndex(dist), child = content.maybeChild(index);
    if (offset == dist || child.isText) {
      if (parent && openStart <= 0 && openEnd <= 0 && !parent.canReplace(index, index, insert))
        return null;
      return content.cut(0, dist).append(insert).append(content.cut(dist));
    }
    let inner = insertInto(child.content, dist - offset - 1, insert, index == 0 ? openStart - 1 : 0, index == content.childCount - 1 ? openEnd - 1 : 0, child);
    return inner && content.replaceChild(index, child.copy(inner));
  }
  function replace($from, $to, slice) {
    if (slice.openStart > $from.depth)
      throw new ReplaceError("Inserted content deeper than insertion position");
    if ($from.depth - slice.openStart != $to.depth - slice.openEnd)
      throw new ReplaceError("Inconsistent open depths");
    return replaceOuter($from, $to, slice, 0);
  }
  function replaceOuter($from, $to, slice, depth) {
    let index = $from.index(depth), node = $from.node(depth);
    if (index == $to.index(depth) && depth < $from.depth - slice.openStart) {
      let inner = replaceOuter($from, $to, slice, depth + 1);
      return node.copy(node.content.replaceChild(index, inner));
    } else if (!slice.content.size) {
      return close(node, replaceTwoWay($from, $to, depth));
    } else if (!slice.openStart && !slice.openEnd && $from.depth == depth && $to.depth == depth) {
      let parent = $from.parent, content = parent.content;
      return close(parent, content.cut(0, $from.parentOffset).append(slice.content).append(content.cut($to.parentOffset)));
    } else {
      let { start, end } = prepareSliceForReplace(slice, $from);
      return close(node, replaceThreeWay($from, start, end, $to, depth));
    }
  }
  function checkJoin(main, sub) {
    if (!sub.type.compatibleContent(main.type))
      throw new ReplaceError("Cannot join " + sub.type.name + " onto " + main.type.name);
  }
  function joinable($before, $after, depth) {
    let node = $before.node(depth);
    checkJoin(node, $after.node(depth));
    return node;
  }
  function addNode(child, target) {
    let last = target.length - 1;
    if (last >= 0 && child.isText && child.sameMarkup(target[last]))
      target[last] = child.withText(target[last].text + child.text);
    else
      target.push(child);
  }
  function addRange($start, $end, depth, target) {
    let node = ($end || $start).node(depth);
    let startIndex = 0, endIndex = $end ? $end.index(depth) : node.childCount;
    if ($start) {
      startIndex = $start.index(depth);
      if ($start.depth > depth) {
        startIndex++;
      } else if ($start.textOffset) {
        addNode($start.nodeAfter, target);
        startIndex++;
      }
    }
    for (let i = startIndex;i < endIndex; i++)
      addNode(node.child(i), target);
    if ($end && $end.depth == depth && $end.textOffset)
      addNode($end.nodeBefore, target);
  }
  function close(node, content) {
    if (!node.type.validContent(content))
      throw new ReplaceError("Invalid content for node " + node.type.name);
    return node.copy(content);
  }
  function replaceThreeWay($from, $start, $end, $to, depth) {
    let openStart = $from.depth > depth && joinable($from, $start, depth + 1);
    let openEnd = $to.depth > depth && joinable($end, $to, depth + 1);
    let content = [];
    addRange(null, $from, depth, content);
    if (openStart && openEnd && $start.index(depth) == $end.index(depth)) {
      checkJoin(openStart, openEnd);
      addNode(close(openStart, replaceThreeWay($from, $start, $end, $to, depth + 1)), content);
    } else {
      if (openStart)
        addNode(close(openStart, replaceTwoWay($from, $start, depth + 1)), content);
      addRange($start, $end, depth, content);
      if (openEnd)
        addNode(close(openEnd, replaceTwoWay($end, $to, depth + 1)), content);
    }
    addRange($to, null, depth, content);
    return new Fragment(content);
  }
  function replaceTwoWay($from, $to, depth) {
    let content = [];
    addRange(null, $from, depth, content);
    if ($from.depth > depth) {
      let type = joinable($from, $to, depth + 1);
      addNode(close(type, replaceTwoWay($from, $to, depth + 1)), content);
    }
    addRange($to, null, depth, content);
    return new Fragment(content);
  }
  function prepareSliceForReplace(slice, $along) {
    let extra = $along.depth - slice.openStart, parent = $along.node(extra);
    let node = parent.copy(slice.content);
    for (let i = extra - 1;i >= 0; i--)
      node = $along.node(i).copy(Fragment.from(node));
    return {
      start: node.resolveNoCache(slice.openStart + extra),
      end: node.resolveNoCache(node.content.size - slice.openEnd - extra)
    };
  }

  class ResolvedPos {
    constructor(pos, path, parentOffset) {
      this.pos = pos;
      this.path = path;
      this.parentOffset = parentOffset;
      this.depth = path.length / 3 - 1;
    }
    resolveDepth(val) {
      if (val == null)
        return this.depth;
      if (val < 0)
        return this.depth + val;
      return val;
    }
    get parent() {
      return this.node(this.depth);
    }
    get doc() {
      return this.node(0);
    }
    node(depth) {
      return this.path[this.resolveDepth(depth) * 3];
    }
    index(depth) {
      return this.path[this.resolveDepth(depth) * 3 + 1];
    }
    indexAfter(depth) {
      depth = this.resolveDepth(depth);
      return this.index(depth) + (depth == this.depth && !this.textOffset ? 0 : 1);
    }
    start(depth) {
      depth = this.resolveDepth(depth);
      return depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
    }
    end(depth) {
      depth = this.resolveDepth(depth);
      return this.start(depth) + this.node(depth).content.size;
    }
    before(depth) {
      depth = this.resolveDepth(depth);
      if (!depth)
        throw new RangeError("There is no position before the top-level node");
      return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1];
    }
    after(depth) {
      depth = this.resolveDepth(depth);
      if (!depth)
        throw new RangeError("There is no position after the top-level node");
      return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1] + this.path[depth * 3].nodeSize;
    }
    get textOffset() {
      return this.pos - this.path[this.path.length - 1];
    }
    get nodeAfter() {
      let parent = this.parent, index = this.index(this.depth);
      if (index == parent.childCount)
        return null;
      let dOff = this.pos - this.path[this.path.length - 1], child = parent.child(index);
      return dOff ? parent.child(index).cut(dOff) : child;
    }
    get nodeBefore() {
      let index = this.index(this.depth);
      let dOff = this.pos - this.path[this.path.length - 1];
      if (dOff)
        return this.parent.child(index).cut(0, dOff);
      return index == 0 ? null : this.parent.child(index - 1);
    }
    posAtIndex(index, depth) {
      depth = this.resolveDepth(depth);
      let node = this.path[depth * 3], pos = depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
      for (let i = 0;i < index; i++)
        pos += node.child(i).nodeSize;
      return pos;
    }
    marks() {
      let parent = this.parent, index = this.index();
      if (parent.content.size == 0)
        return Mark.none;
      if (this.textOffset)
        return parent.child(index).marks;
      let main = parent.maybeChild(index - 1), other = parent.maybeChild(index);
      if (!main) {
        let tmp = main;
        main = other;
        other = tmp;
      }
      let marks = main.marks;
      for (var i = 0;i < marks.length; i++)
        if (marks[i].type.spec.inclusive === false && (!other || !marks[i].isInSet(other.marks)))
          marks = marks[i--].removeFromSet(marks);
      return marks;
    }
    marksAcross($end) {
      let after = this.parent.maybeChild(this.index());
      if (!after || !after.isInline)
        return null;
      let marks = after.marks, next = $end.parent.maybeChild($end.index());
      for (var i = 0;i < marks.length; i++)
        if (marks[i].type.spec.inclusive === false && (!next || !marks[i].isInSet(next.marks)))
          marks = marks[i--].removeFromSet(marks);
      return marks;
    }
    sharedDepth(pos) {
      for (let depth = this.depth;depth > 0; depth--)
        if (this.start(depth) <= pos && this.end(depth) >= pos)
          return depth;
      return 0;
    }
    blockRange(other = this, pred) {
      if (other.pos < this.pos)
        return other.blockRange(this);
      for (let d = this.depth - (this.parent.inlineContent || this.pos == other.pos ? 1 : 0);d >= 0; d--)
        if (other.pos <= this.end(d) && (!pred || pred(this.node(d))))
          return new NodeRange(this, other, d);
      return null;
    }
    sameParent(other) {
      return this.pos - this.parentOffset == other.pos - other.parentOffset;
    }
    max(other) {
      return other.pos > this.pos ? other : this;
    }
    min(other) {
      return other.pos < this.pos ? other : this;
    }
    toString() {
      let str = "";
      for (let i = 1;i <= this.depth; i++)
        str += (str ? "/" : "") + this.node(i).type.name + "_" + this.index(i - 1);
      return str + ":" + this.parentOffset;
    }
    static resolve(doc, pos) {
      if (!(pos >= 0 && pos <= doc.content.size))
        throw new RangeError("Position " + pos + " out of range");
      let path = [];
      let start = 0, parentOffset = pos;
      for (let node = doc;; ) {
        let { index, offset } = node.content.findIndex(parentOffset);
        let rem = parentOffset - offset;
        path.push(node, index, start + offset);
        if (!rem)
          break;
        node = node.child(index);
        if (node.isText)
          break;
        parentOffset = rem - 1;
        start += offset + 1;
      }
      return new ResolvedPos(pos, path, parentOffset);
    }
    static resolveCached(doc, pos) {
      let cache = resolveCache.get(doc);
      if (cache) {
        for (let i = 0;i < cache.elts.length; i++) {
          let elt = cache.elts[i];
          if (elt.pos == pos)
            return elt;
        }
      } else {
        resolveCache.set(doc, cache = new ResolveCache);
      }
      let result = cache.elts[cache.i] = ResolvedPos.resolve(doc, pos);
      cache.i = (cache.i + 1) % resolveCacheSize;
      return result;
    }
  }

  class ResolveCache {
    constructor() {
      this.elts = [];
      this.i = 0;
    }
  }
  var resolveCacheSize = 12;
  var resolveCache = new WeakMap;

  class NodeRange {
    constructor($from, $to, depth) {
      this.$from = $from;
      this.$to = $to;
      this.depth = depth;
    }
    get start() {
      return this.$from.before(this.depth + 1);
    }
    get end() {
      return this.$to.after(this.depth + 1);
    }
    get parent() {
      return this.$from.node(this.depth);
    }
    get startIndex() {
      return this.$from.index(this.depth);
    }
    get endIndex() {
      return this.$to.indexAfter(this.depth);
    }
  }
  var emptyAttrs = Object.create(null);

  class Node {
    constructor(type, attrs, content, marks = Mark.none) {
      this.type = type;
      this.attrs = attrs;
      this.marks = marks;
      this.content = content || Fragment.empty;
    }
    get children() {
      return this.content.content;
    }
    get nodeSize() {
      return this.isLeaf ? 1 : 2 + this.content.size;
    }
    get childCount() {
      return this.content.childCount;
    }
    child(index) {
      return this.content.child(index);
    }
    maybeChild(index) {
      return this.content.maybeChild(index);
    }
    forEach(f) {
      this.content.forEach(f);
    }
    nodesBetween(from, to, f, startPos = 0) {
      this.content.nodesBetween(from, to, f, startPos, this);
    }
    descendants(f) {
      this.nodesBetween(0, this.content.size, f);
    }
    get textContent() {
      return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
    }
    textBetween(from, to, blockSeparator, leafText) {
      return this.content.textBetween(from, to, blockSeparator, leafText);
    }
    get firstChild() {
      return this.content.firstChild;
    }
    get lastChild() {
      return this.content.lastChild;
    }
    eq(other) {
      return this == other || this.sameMarkup(other) && this.content.eq(other.content);
    }
    sameMarkup(other) {
      return this.hasMarkup(other.type, other.attrs, other.marks);
    }
    hasMarkup(type, attrs, marks) {
      return this.type == type && compareDeep(this.attrs, attrs || type.defaultAttrs || emptyAttrs) && Mark.sameSet(this.marks, marks || Mark.none);
    }
    copy(content = null) {
      if (content == this.content)
        return this;
      return new Node(this.type, this.attrs, content, this.marks);
    }
    mark(marks) {
      return marks == this.marks ? this : new Node(this.type, this.attrs, this.content, marks);
    }
    cut(from, to = this.content.size) {
      if (from == 0 && to == this.content.size)
        return this;
      return this.copy(this.content.cut(from, to));
    }
    slice(from, to = this.content.size, includeParents = false) {
      if (from == to)
        return Slice.empty;
      let $from = this.resolve(from), $to = this.resolve(to);
      let depth = includeParents ? 0 : $from.sharedDepth(to);
      let start = $from.start(depth), node = $from.node(depth);
      let content = node.content.cut($from.pos - start, $to.pos - start);
      return new Slice(content, $from.depth - depth, $to.depth - depth);
    }
    replace(from, to, slice) {
      return replace(this.resolve(from), this.resolve(to), slice);
    }
    nodeAt(pos) {
      for (let node = this;; ) {
        let { index, offset } = node.content.findIndex(pos);
        node = node.maybeChild(index);
        if (!node)
          return null;
        if (offset == pos || node.isText)
          return node;
        pos -= offset + 1;
      }
    }
    childAfter(pos) {
      let { index, offset } = this.content.findIndex(pos);
      return { node: this.content.maybeChild(index), index, offset };
    }
    childBefore(pos) {
      if (pos == 0)
        return { node: null, index: 0, offset: 0 };
      let { index, offset } = this.content.findIndex(pos);
      if (offset < pos)
        return { node: this.content.child(index), index, offset };
      let node = this.content.child(index - 1);
      return { node, index: index - 1, offset: offset - node.nodeSize };
    }
    resolve(pos) {
      return ResolvedPos.resolveCached(this, pos);
    }
    resolveNoCache(pos) {
      return ResolvedPos.resolve(this, pos);
    }
    rangeHasMark(from, to, type) {
      let found2 = false;
      if (to > from)
        this.nodesBetween(from, to, (node) => {
          if (type.isInSet(node.marks))
            found2 = true;
          return !found2;
        });
      return found2;
    }
    get isBlock() {
      return this.type.isBlock;
    }
    get isTextblock() {
      return this.type.isTextblock;
    }
    get inlineContent() {
      return this.type.inlineContent;
    }
    get isInline() {
      return this.type.isInline;
    }
    get isText() {
      return this.type.isText;
    }
    get isLeaf() {
      return this.type.isLeaf;
    }
    get isAtom() {
      return this.type.isAtom;
    }
    toString() {
      if (this.type.spec.toDebugString)
        return this.type.spec.toDebugString(this);
      let name = this.type.name;
      if (this.content.size)
        name += "(" + this.content.toStringInner() + ")";
      return wrapMarks(this.marks, name);
    }
    contentMatchAt(index) {
      let match = this.type.contentMatch.matchFragment(this.content, 0, index);
      if (!match)
        throw new Error("Called contentMatchAt on a node with invalid content");
      return match;
    }
    canReplace(from, to, replacement = Fragment.empty, start = 0, end = replacement.childCount) {
      let one = this.contentMatchAt(from).matchFragment(replacement, start, end);
      let two = one && one.matchFragment(this.content, to);
      if (!two || !two.validEnd)
        return false;
      for (let i = start;i < end; i++)
        if (!this.type.allowsMarks(replacement.child(i).marks))
          return false;
      return true;
    }
    canReplaceWith(from, to, type, marks) {
      if (marks && !this.type.allowsMarks(marks))
        return false;
      let start = this.contentMatchAt(from).matchType(type);
      let end = start && start.matchFragment(this.content, to);
      return end ? end.validEnd : false;
    }
    canAppend(other) {
      if (other.content.size)
        return this.canReplace(this.childCount, this.childCount, other.content);
      else
        return this.type.compatibleContent(other.type);
    }
    check() {
      this.type.checkContent(this.content);
      checkAttrs(this.type.attrs, this.attrs, "node", this.type.name);
      let copy = Mark.none;
      for (let i = 0;i < this.marks.length; i++) {
        let mark = this.marks[i];
        checkAttrs(mark.type.attrs, mark.attrs, "mark", mark.type.name);
        copy = mark.addToSet(copy);
      }
      if (!Mark.sameSet(copy, this.marks))
        throw new RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((m) => m.type.name)}`);
      this.content.forEach((node) => node.check());
    }
    toJSON() {
      let obj = { type: this.type.name };
      for (let _ in this.attrs) {
        obj.attrs = this.attrs;
        break;
      }
      if (this.content.size)
        obj.content = this.content.toJSON();
      if (this.marks.length)
        obj.marks = this.marks.map((n) => n.toJSON());
      return obj;
    }
    static fromJSON(schema, json) {
      if (!json)
        throw new RangeError("Invalid input for Node.fromJSON");
      let marks = undefined;
      if (json.marks) {
        if (!Array.isArray(json.marks))
          throw new RangeError("Invalid mark data for Node.fromJSON");
        marks = json.marks.map(schema.markFromJSON);
      }
      if (json.type == "text") {
        if (typeof json.text != "string")
          throw new RangeError("Invalid text node in JSON");
        return schema.text(json.text, marks);
      }
      let content = Fragment.fromJSON(schema, json.content);
      let node = schema.nodeType(json.type).create(json.attrs, content, marks);
      return node;
    }
  }
  Node.prototype.text = undefined;

  class TextNode extends Node {
    constructor(type, attrs, content, marks) {
      super(type, attrs, null, marks);
      if (!content)
        throw new RangeError("Empty text nodes are not allowed");
      this.text = content;
    }
    toString() {
      if (this.type.spec.toDebugString)
        return this.type.spec.toDebugString(this);
      return wrapMarks(this.marks, JSON.stringify(this.text));
    }
    get textContent() {
      return this.text;
    }
    textBetween(from, to) {
      return this.text.slice(from, to);
    }
    get nodeSize() {
      return this.text.length;
    }
    mark(marks) {
      return marks == this.marks ? this : new TextNode(this.type, this.attrs, this.text, marks);
    }
    withText(text) {
      if (text == this.text)
        return this;
      return new TextNode(this.type, this.attrs, text, this.marks);
    }
    cut(from = 0, to = this.text.length) {
      if (from == 0 && to == this.text.length)
        return this;
      return this.withText(this.text.slice(from, to));
    }
    eq(other) {
      return this.sameMarkup(other) && this.text == other.text;
    }
    toJSON() {
      let base = super.toJSON();
      base.text = this.text;
      return base;
    }
  }
  function wrapMarks(marks, str) {
    for (let i = marks.length - 1;i >= 0; i--)
      str = marks[i].type.name + "(" + str + ")";
    return str;
  }
  function checkAttrs(attrs, values, type, name) {
    for (let attr in values)
      if (!(attr in attrs))
        throw new RangeError(`Unsupported attribute ${attr} for ${type} of type ${name}`);
    for (let attr in attrs) {
      if (attrs[attr].validate)
        attrs[attr].validate(values[attr]);
    }
  }

  class ContentMatch {
    constructor(validEnd) {
      this.validEnd = validEnd;
      this.next = [];
      this.wrapCache = [];
    }
    static parse(string, nodeTypes) {
      let stream = new TokenStream(string, nodeTypes);
      if (stream.next == null)
        return ContentMatch.empty;
      let expr = parseExpr(stream);
      if (stream.next)
        stream.err("Unexpected trailing text");
      let match = dfa(nfa(expr));
      checkForDeadEnds(match, stream);
      return match;
    }
    matchType(type) {
      for (let i = 0;i < this.next.length; i++)
        if (this.next[i].type == type)
          return this.next[i].next;
      return null;
    }
    matchFragment(frag, start = 0, end = frag.childCount) {
      let cur = this;
      for (let i = start;cur && i < end; i++)
        cur = cur.matchType(frag.child(i).type);
      return cur;
    }
    get inlineContent() {
      return this.next.length != 0 && this.next[0].type.isInline;
    }
    get defaultType() {
      for (let i = 0;i < this.next.length; i++) {
        let { type } = this.next[i];
        if (!(type.isText || type.hasRequiredAttrs()))
          return type;
      }
      return null;
    }
    compatible(other) {
      for (let i = 0;i < this.next.length; i++)
        for (let j = 0;j < other.next.length; j++)
          if (this.next[i].type == other.next[j].type)
            return true;
      return false;
    }
    fillBefore(after, toEnd = false, startIndex = 0) {
      let seen = [this];
      function search(match, types) {
        let finished = match.matchFragment(after, startIndex);
        if (finished && (!toEnd || finished.validEnd))
          return Fragment.from(types.map((tp) => tp.createAndFill()));
        for (let i = 0;i < match.next.length; i++) {
          let { type, next } = match.next[i];
          if (!(type.isText || type.hasRequiredAttrs()) && seen.indexOf(next) == -1) {
            seen.push(next);
            let found2 = search(next, types.concat(type));
            if (found2)
              return found2;
          }
        }
        return null;
      }
      return search(this, []);
    }
    findWrapping(target) {
      for (let i = 0;i < this.wrapCache.length; i += 2)
        if (this.wrapCache[i] == target)
          return this.wrapCache[i + 1];
      let computed = this.computeWrapping(target);
      this.wrapCache.push(target, computed);
      return computed;
    }
    computeWrapping(target) {
      let seen = Object.create(null), active = [{ match: this, type: null, via: null }];
      while (active.length) {
        let current = active.shift(), match = current.match;
        if (match.matchType(target)) {
          let result = [];
          for (let obj = current;obj.type; obj = obj.via)
            result.push(obj.type);
          return result.reverse();
        }
        for (let i = 0;i < match.next.length; i++) {
          let { type, next } = match.next[i];
          if (!type.isLeaf && !type.hasRequiredAttrs() && !(type.name in seen) && (!current.type || next.validEnd)) {
            active.push({ match: type.contentMatch, type, via: current });
            seen[type.name] = true;
          }
        }
      }
      return null;
    }
    get edgeCount() {
      return this.next.length;
    }
    edge(n) {
      if (n >= this.next.length)
        throw new RangeError(`There's no ${n}th edge in this content match`);
      return this.next[n];
    }
    toString() {
      let seen = [];
      function scan(m) {
        seen.push(m);
        for (let i = 0;i < m.next.length; i++)
          if (seen.indexOf(m.next[i].next) == -1)
            scan(m.next[i].next);
      }
      scan(this);
      return seen.map((m, i) => {
        let out = i + (m.validEnd ? "*" : " ") + " ";
        for (let i2 = 0;i2 < m.next.length; i2++)
          out += (i2 ? ", " : "") + m.next[i2].type.name + "->" + seen.indexOf(m.next[i2].next);
        return out;
      }).join(`
`);
    }
  }
  ContentMatch.empty = new ContentMatch(true);

  class TokenStream {
    constructor(string, nodeTypes) {
      this.string = string;
      this.nodeTypes = nodeTypes;
      this.inline = null;
      this.pos = 0;
      this.tokens = string.split(/\s*(?=\b|\W|$)/);
      if (this.tokens[this.tokens.length - 1] == "")
        this.tokens.pop();
      if (this.tokens[0] == "")
        this.tokens.shift();
    }
    get next() {
      return this.tokens[this.pos];
    }
    eat(tok) {
      return this.next == tok && (this.pos++ || true);
    }
    err(str) {
      throw new SyntaxError(str + " (in content expression '" + this.string + "')");
    }
  }
  function parseExpr(stream) {
    let exprs = [];
    do {
      exprs.push(parseExprSeq(stream));
    } while (stream.eat("|"));
    return exprs.length == 1 ? exprs[0] : { type: "choice", exprs };
  }
  function parseExprSeq(stream) {
    let exprs = [];
    do {
      exprs.push(parseExprSubscript(stream));
    } while (stream.next && stream.next != ")" && stream.next != "|");
    return exprs.length == 1 ? exprs[0] : { type: "seq", exprs };
  }
  function parseExprSubscript(stream) {
    let expr = parseExprAtom(stream);
    for (;; ) {
      if (stream.eat("+"))
        expr = { type: "plus", expr };
      else if (stream.eat("*"))
        expr = { type: "star", expr };
      else if (stream.eat("?"))
        expr = { type: "opt", expr };
      else if (stream.eat("{"))
        expr = parseExprRange(stream, expr);
      else
        break;
    }
    return expr;
  }
  function parseNum(stream) {
    if (/\D/.test(stream.next))
      stream.err("Expected number, got '" + stream.next + "'");
    let result = Number(stream.next);
    stream.pos++;
    return result;
  }
  function parseExprRange(stream, expr) {
    let min = parseNum(stream), max = min;
    if (stream.eat(",")) {
      if (stream.next != "}")
        max = parseNum(stream);
      else
        max = -1;
    }
    if (!stream.eat("}"))
      stream.err("Unclosed braced range");
    return { type: "range", min, max, expr };
  }
  function resolveName(stream, name) {
    let types = stream.nodeTypes, type = types[name];
    if (type)
      return [type];
    let result = [];
    for (let typeName in types) {
      let type2 = types[typeName];
      if (type2.isInGroup(name))
        result.push(type2);
    }
    if (result.length == 0)
      stream.err("No node type or group '" + name + "' found");
    return result;
  }
  function parseExprAtom(stream) {
    if (stream.eat("(")) {
      let expr = parseExpr(stream);
      if (!stream.eat(")"))
        stream.err("Missing closing paren");
      return expr;
    } else if (!/\W/.test(stream.next)) {
      let exprs = resolveName(stream, stream.next).map((type) => {
        if (stream.inline == null)
          stream.inline = type.isInline;
        else if (stream.inline != type.isInline)
          stream.err("Mixing inline and block content");
        return { type: "name", value: type };
      });
      stream.pos++;
      return exprs.length == 1 ? exprs[0] : { type: "choice", exprs };
    } else {
      stream.err("Unexpected token '" + stream.next + "'");
    }
  }
  function nfa(expr) {
    let nfa2 = [[]];
    connect(compile(expr, 0), node());
    return nfa2;
    function node() {
      return nfa2.push([]) - 1;
    }
    function edge(from, to, term) {
      let edge2 = { term, to };
      nfa2[from].push(edge2);
      return edge2;
    }
    function connect(edges, to) {
      edges.forEach((edge2) => edge2.to = to);
    }
    function compile(expr2, from) {
      if (expr2.type == "choice") {
        return expr2.exprs.reduce((out, expr3) => out.concat(compile(expr3, from)), []);
      } else if (expr2.type == "seq") {
        for (let i = 0;; i++) {
          let next = compile(expr2.exprs[i], from);
          if (i == expr2.exprs.length - 1)
            return next;
          connect(next, from = node());
        }
      } else if (expr2.type == "star") {
        let loop = node();
        edge(from, loop);
        connect(compile(expr2.expr, loop), loop);
        return [edge(loop)];
      } else if (expr2.type == "plus") {
        let loop = node();
        connect(compile(expr2.expr, from), loop);
        connect(compile(expr2.expr, loop), loop);
        return [edge(loop)];
      } else if (expr2.type == "opt") {
        return [edge(from)].concat(compile(expr2.expr, from));
      } else if (expr2.type == "range") {
        let cur = from;
        for (let i = 0;i < expr2.min; i++) {
          let next = node();
          connect(compile(expr2.expr, cur), next);
          cur = next;
        }
        if (expr2.max == -1) {
          connect(compile(expr2.expr, cur), cur);
        } else {
          for (let i = expr2.min;i < expr2.max; i++) {
            let next = node();
            edge(cur, next);
            connect(compile(expr2.expr, cur), next);
            cur = next;
          }
        }
        return [edge(cur)];
      } else if (expr2.type == "name") {
        return [edge(from, undefined, expr2.value)];
      } else {
        throw new Error("Unknown expr type");
      }
    }
  }
  function cmp(a, b) {
    return b - a;
  }
  function nullFrom(nfa2, node) {
    let result = [];
    scan(node);
    return result.sort(cmp);
    function scan(node2) {
      let edges = nfa2[node2];
      if (edges.length == 1 && !edges[0].term)
        return scan(edges[0].to);
      result.push(node2);
      for (let i = 0;i < edges.length; i++) {
        let { term, to } = edges[i];
        if (!term && result.indexOf(to) == -1)
          scan(to);
      }
    }
  }
  function dfa(nfa2) {
    let labeled = Object.create(null);
    return explore(nullFrom(nfa2, 0));
    function explore(states) {
      let out = [];
      states.forEach((node) => {
        nfa2[node].forEach(({ term, to }) => {
          if (!term)
            return;
          let set;
          for (let i = 0;i < out.length; i++)
            if (out[i][0] == term)
              set = out[i][1];
          nullFrom(nfa2, to).forEach((node2) => {
            if (!set)
              out.push([term, set = []]);
            if (set.indexOf(node2) == -1)
              set.push(node2);
          });
        });
      });
      let state = labeled[states.join(",")] = new ContentMatch(states.indexOf(nfa2.length - 1) > -1);
      for (let i = 0;i < out.length; i++) {
        let states2 = out[i][1].sort(cmp);
        state.next.push({ type: out[i][0], next: labeled[states2.join(",")] || explore(states2) });
      }
      return state;
    }
  }
  function checkForDeadEnds(match, stream) {
    for (let i = 0, work = [match];i < work.length; i++) {
      let state = work[i], dead = !state.validEnd, nodes = [];
      for (let j = 0;j < state.next.length; j++) {
        let { type, next } = state.next[j];
        nodes.push(type.name);
        if (dead && !(type.isText || type.hasRequiredAttrs()))
          dead = false;
        if (work.indexOf(next) == -1)
          work.push(next);
      }
      if (dead)
        stream.err("Only non-generatable nodes (" + nodes.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
    }
  }
  function defaultAttrs(attrs) {
    let defaults = Object.create(null);
    for (let attrName in attrs) {
      let attr = attrs[attrName];
      if (!attr.hasDefault)
        return null;
      defaults[attrName] = attr.default;
    }
    return defaults;
  }
  function computeAttrs(attrs, value) {
    let built = Object.create(null);
    for (let name in attrs) {
      let attr = attrs[name];
      let given = value && value[name];
      if (given === undefined) {
        if (attr.hasDefault)
          given = attr.default;
        else
          throw new RangeError("No value supplied for attribute " + name);
      } else if (attr.validate) {
        attr.validate(given);
      }
      built[name] = given;
    }
    return built;
  }
  function initAttrs(typeName, attrs) {
    let result = Object.create(null);
    if (attrs)
      for (let name in attrs)
        result[name] = new Attribute(typeName, name, attrs[name]);
    return result;
  }

  class NodeType {
    constructor(name, schema, spec) {
      this.name = name;
      this.schema = schema;
      this.spec = spec;
      this.markSet = null;
      this.groups = spec.group ? spec.group.split(" ") : [];
      this.attrs = initAttrs(name, spec.attrs);
      this.defaultAttrs = defaultAttrs(this.attrs);
      this.contentMatch = null;
      this.inlineContent = null;
      this.isBlock = !(spec.inline || name == "text");
      this.isText = name == "text";
    }
    get isInline() {
      return !this.isBlock;
    }
    get isTextblock() {
      return this.isBlock && this.inlineContent;
    }
    get isLeaf() {
      return this.contentMatch == ContentMatch.empty;
    }
    get isAtom() {
      return this.isLeaf || !!this.spec.atom;
    }
    isInGroup(group) {
      return this.groups.indexOf(group) > -1;
    }
    get whitespace() {
      return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
    }
    hasRequiredAttrs() {
      for (let n in this.attrs)
        if (this.attrs[n].isRequired)
          return true;
      return false;
    }
    compatibleContent(other) {
      return this == other || this.contentMatch.compatible(other.contentMatch);
    }
    computeAttrs(attrs) {
      if (!attrs && this.defaultAttrs)
        return this.defaultAttrs;
      else
        return computeAttrs(this.attrs, attrs);
    }
    create(attrs = null, content, marks) {
      if (this.isText)
        throw new Error("NodeType.create can't construct text nodes");
      return new Node(this, this.computeAttrs(attrs), Fragment.from(content), Mark.setFrom(marks));
    }
    createChecked(attrs = null, content, marks) {
      content = Fragment.from(content);
      this.checkContent(content);
      return new Node(this, this.computeAttrs(attrs), content, Mark.setFrom(marks));
    }
    createAndFill(attrs = null, content, marks) {
      attrs = this.computeAttrs(attrs);
      content = Fragment.from(content);
      if (content.size) {
        let before = this.contentMatch.fillBefore(content);
        if (!before)
          return null;
        content = before.append(content);
      }
      let matched = this.contentMatch.matchFragment(content);
      let after = matched && matched.fillBefore(Fragment.empty, true);
      if (!after)
        return null;
      return new Node(this, attrs, content.append(after), Mark.setFrom(marks));
    }
    validContent(content) {
      let result = this.contentMatch.matchFragment(content);
      if (!result || !result.validEnd)
        return false;
      for (let i = 0;i < content.childCount; i++)
        if (!this.allowsMarks(content.child(i).marks))
          return false;
      return true;
    }
    checkContent(content) {
      if (!this.validContent(content))
        throw new RangeError(`Invalid content for node ${this.name}: ${content.toString().slice(0, 50)}`);
    }
    checkAttrs(attrs) {}
    allowsMarkType(markType) {
      return this.markSet == null || this.markSet.indexOf(markType) > -1;
    }
    allowsMarks(marks) {
      if (this.markSet == null)
        return true;
      for (let i = 0;i < marks.length; i++)
        if (!this.allowsMarkType(marks[i].type))
          return false;
      return true;
    }
    allowedMarks(marks) {
      if (this.markSet == null)
        return marks;
      let copy;
      for (let i = 0;i < marks.length; i++) {
        if (!this.allowsMarkType(marks[i].type)) {
          if (!copy)
            copy = marks.slice(0, i);
        } else if (copy) {
          copy.push(marks[i]);
        }
      }
      return !copy ? marks : copy.length ? copy : Mark.none;
    }
    static compile(nodes, schema) {
      let result = Object.create(null);
      nodes.forEach((name, spec) => result[name] = new NodeType(name, schema, spec));
      let topType = schema.spec.topNode || "doc";
      if (!result[topType])
        throw new RangeError("Schema is missing its top node type ('" + topType + "')");
      if (!result.text)
        throw new RangeError("Every schema needs a 'text' type");
      for (let _ in result.text.attrs)
        throw new RangeError("The text node type should not have attributes");
      return result;
    }
  }
  function validateType(typeName, attrName, type) {
    let types = type.split("|");
    return (value) => {
      let name = value === null ? "null" : typeof value;
      if (types.indexOf(name) < 0)
        throw new RangeError(`Expected value of type ${types} for attribute ${attrName} on type ${typeName}, got ${name}`);
    };
  }

  class Attribute {
    constructor(typeName, attrName, options) {
      this.hasDefault = Object.prototype.hasOwnProperty.call(options, "default");
      this.default = options.default;
      this.validate = typeof options.validate == "string" ? validateType(typeName, attrName, options.validate) : options.validate;
    }
    get isRequired() {
      return !this.hasDefault;
    }
  }

  class MarkType {
    constructor(name, rank, schema, spec) {
      this.name = name;
      this.rank = rank;
      this.schema = schema;
      this.spec = spec;
      this.attrs = initAttrs(name, spec.attrs);
      this.excluded = null;
      let defaults = defaultAttrs(this.attrs);
      this.instance = defaults ? new Mark(this, defaults) : null;
    }
    create(attrs = null) {
      if (!attrs && this.instance)
        return this.instance;
      return new Mark(this, computeAttrs(this.attrs, attrs));
    }
    static compile(marks, schema) {
      let result = Object.create(null), rank = 0;
      marks.forEach((name, spec) => result[name] = new MarkType(name, rank++, schema, spec));
      return result;
    }
    removeFromSet(set) {
      for (var i = 0;i < set.length; i++)
        if (set[i].type == this) {
          set = set.slice(0, i).concat(set.slice(i + 1));
          i--;
        }
      return set;
    }
    isInSet(set) {
      for (let i = 0;i < set.length; i++)
        if (set[i].type == this)
          return set[i];
    }
    excludes(other) {
      return this.excluded.indexOf(other) > -1;
    }
  }

  class Schema {
    constructor(spec) {
      this.linebreakReplacement = null;
      this.cached = Object.create(null);
      let instanceSpec = this.spec = {};
      for (let prop in spec)
        instanceSpec[prop] = spec[prop];
      instanceSpec.nodes = dist_default.from(spec.nodes), instanceSpec.marks = dist_default.from(spec.marks || {}), this.nodes = NodeType.compile(this.spec.nodes, this);
      this.marks = MarkType.compile(this.spec.marks, this);
      let contentExprCache = Object.create(null);
      for (let prop in this.nodes) {
        if (prop in this.marks)
          throw new RangeError(prop + " can not be both a node and a mark");
        let type = this.nodes[prop], contentExpr = type.spec.content || "", markExpr = type.spec.marks;
        type.contentMatch = contentExprCache[contentExpr] || (contentExprCache[contentExpr] = ContentMatch.parse(contentExpr, this.nodes));
        type.inlineContent = type.contentMatch.inlineContent;
        if (type.spec.linebreakReplacement) {
          if (this.linebreakReplacement)
            throw new RangeError("Multiple linebreak nodes defined");
          if (!type.isInline || !type.isLeaf)
            throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
          this.linebreakReplacement = type;
        }
        type.markSet = markExpr == "_" ? null : markExpr ? gatherMarks(this, markExpr.split(" ")) : markExpr == "" || !type.inlineContent ? [] : null;
      }
      for (let prop in this.marks) {
        let type = this.marks[prop], excl = type.spec.excludes;
        type.excluded = excl == null ? [type] : excl == "" ? [] : gatherMarks(this, excl.split(" "));
      }
      this.nodeFromJSON = (json) => Node.fromJSON(this, json);
      this.markFromJSON = (json) => Mark.fromJSON(this, json);
      this.topNodeType = this.nodes[this.spec.topNode || "doc"];
      this.cached.wrappings = Object.create(null);
    }
    node(type, attrs = null, content, marks) {
      if (typeof type == "string")
        type = this.nodeType(type);
      else if (!(type instanceof NodeType))
        throw new RangeError("Invalid node type: " + type);
      else if (type.schema != this)
        throw new RangeError("Node type from different schema used (" + type.name + ")");
      return type.createChecked(attrs, content, marks);
    }
    text(text, marks) {
      let type = this.nodes.text;
      return new TextNode(type, type.defaultAttrs, text, Mark.setFrom(marks));
    }
    mark(type, attrs) {
      if (typeof type == "string")
        type = this.marks[type];
      return type.create(attrs);
    }
    nodeType(name) {
      let found2 = this.nodes[name];
      if (!found2)
        throw new RangeError("Unknown node type: " + name);
      return found2;
    }
  }
  function gatherMarks(schema, marks) {
    let found2 = [];
    for (let i = 0;i < marks.length; i++) {
      let name = marks[i], mark = schema.marks[name], ok = mark;
      if (mark) {
        found2.push(mark);
      } else {
        for (let prop in schema.marks) {
          let mark2 = schema.marks[prop];
          if (name == "_" || mark2.spec.group && mark2.spec.group.split(" ").indexOf(name) > -1)
            found2.push(ok = mark2);
        }
      }
      if (!ok)
        throw new SyntaxError("Unknown mark type: '" + marks[i] + "'");
    }
    return found2;
  }
  var suspiciousAttributeCache = new WeakMap;

  // apps/ios/EditorModel/node_modules/prosemirror-transform/dist/index.js
  var lower16 = 65535;
  var factor16 = Math.pow(2, 16);
  function makeRecover(index, offset) {
    return index + offset * factor16;
  }
  function recoverIndex(value) {
    return value & lower16;
  }
  function recoverOffset(value) {
    return (value - (value & lower16)) / factor16;
  }
  var DEL_BEFORE = 1;
  var DEL_AFTER = 2;
  var DEL_ACROSS = 4;
  var DEL_SIDE = 8;

  class MapResult {
    constructor(pos, delInfo, recover) {
      this.pos = pos;
      this.delInfo = delInfo;
      this.recover = recover;
    }
    get deleted() {
      return (this.delInfo & DEL_SIDE) > 0;
    }
    get deletedBefore() {
      return (this.delInfo & (DEL_BEFORE | DEL_ACROSS)) > 0;
    }
    get deletedAfter() {
      return (this.delInfo & (DEL_AFTER | DEL_ACROSS)) > 0;
    }
    get deletedAcross() {
      return (this.delInfo & DEL_ACROSS) > 0;
    }
  }

  class StepMap {
    constructor(ranges, inverted = false) {
      this.ranges = ranges;
      this.inverted = inverted;
      if (!ranges.length && StepMap.empty)
        return StepMap.empty;
    }
    recover(value) {
      let diff = 0, index = recoverIndex(value);
      if (!this.inverted)
        for (let i = 0;i < index; i++)
          diff += this.ranges[i * 3 + 2] - this.ranges[i * 3 + 1];
      return this.ranges[index * 3] + diff + recoverOffset(value);
    }
    mapResult(pos, assoc = 1) {
      return this._map(pos, assoc, false);
    }
    map(pos, assoc = 1) {
      return this._map(pos, assoc, true);
    }
    _map(pos, assoc, simple) {
      let diff = 0, oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
      for (let i = 0;i < this.ranges.length; i += 3) {
        let start = this.ranges[i] - (this.inverted ? diff : 0);
        if (start > pos)
          break;
        let oldSize = this.ranges[i + oldIndex], newSize = this.ranges[i + newIndex], end = start + oldSize;
        if (pos <= end) {
          let side = !oldSize ? assoc : pos == start ? -1 : pos == end ? 1 : assoc;
          let result = start + diff + (side < 0 ? 0 : newSize);
          if (simple)
            return result;
          let recover = pos == (assoc < 0 ? start : end) ? null : makeRecover(i / 3, pos - start);
          let del = 0;
          if (oldSize) {
            del |= pos == start ? DEL_AFTER : pos == end ? DEL_BEFORE : DEL_ACROSS;
            if (assoc < 0 ? pos != start : pos != end)
              del |= DEL_SIDE;
          }
          return new MapResult(result, del, recover);
        }
        diff += newSize - oldSize;
      }
      return simple ? pos + diff : new MapResult(pos + diff, 0, null);
    }
    touches(pos, recover) {
      let diff = 0, index = recoverIndex(recover);
      let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
      for (let i = 0;i < this.ranges.length; i += 3) {
        let start = this.ranges[i] - (this.inverted ? diff : 0);
        if (start > pos)
          break;
        let oldSize = this.ranges[i + oldIndex], end = start + oldSize;
        if (pos <= end && i == index * 3)
          return true;
        diff += this.ranges[i + newIndex] - oldSize;
      }
      return false;
    }
    forEach(f) {
      let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
      for (let i = 0, diff = 0;i < this.ranges.length; i += 3) {
        let start = this.ranges[i], oldStart = start - (this.inverted ? diff : 0), newStart = start + (this.inverted ? 0 : diff);
        let oldSize = this.ranges[i + oldIndex], newSize = this.ranges[i + newIndex];
        f(oldStart, oldStart + oldSize, newStart, newStart + newSize);
        diff += newSize - oldSize;
      }
    }
    invert() {
      return new StepMap(this.ranges, !this.inverted);
    }
    toString() {
      return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
    }
    static offset(n) {
      return n == 0 ? StepMap.empty : new StepMap(n < 0 ? [0, -n, 0] : [0, 0, n]);
    }
  }
  StepMap.empty = new StepMap([]);

  class Mapping {
    constructor(maps, mirror, from = 0, to = maps ? maps.length : 0) {
      this.mirror = mirror;
      this.from = from;
      this.to = to;
      this._maps = maps || [];
      this.ownData = !(maps || mirror);
    }
    get maps() {
      return this._maps;
    }
    slice(from = 0, to = this.maps.length) {
      return new Mapping(this._maps, this.mirror, from, to);
    }
    appendMap(map, mirrors) {
      if (!this.ownData) {
        this._maps = this._maps.slice();
        this.mirror = this.mirror && this.mirror.slice();
        this.ownData = true;
      }
      this.to = this._maps.push(map);
      if (mirrors != null)
        this.setMirror(this._maps.length - 1, mirrors);
    }
    appendMapping(mapping) {
      for (let i = 0, startSize = this._maps.length;i < mapping._maps.length; i++) {
        let mirr = mapping.getMirror(i);
        this.appendMap(mapping._maps[i], mirr != null && mirr < i ? startSize + mirr : undefined);
      }
    }
    getMirror(n) {
      if (this.mirror) {
        for (let i = 0;i < this.mirror.length; i++)
          if (this.mirror[i] == n)
            return this.mirror[i + (i % 2 ? -1 : 1)];
      }
    }
    setMirror(n, m) {
      if (!this.mirror)
        this.mirror = [];
      this.mirror.push(n, m);
    }
    appendMappingInverted(mapping) {
      for (let i = mapping.maps.length - 1, totalSize = this._maps.length + mapping._maps.length;i >= 0; i--) {
        let mirr = mapping.getMirror(i);
        this.appendMap(mapping._maps[i].invert(), mirr != null && mirr > i ? totalSize - mirr - 1 : undefined);
      }
    }
    invert() {
      let inverse = new Mapping;
      inverse.appendMappingInverted(this);
      return inverse;
    }
    map(pos, assoc = 1) {
      if (this.mirror)
        return this._map(pos, assoc, true);
      for (let i = this.from;i < this.to; i++)
        pos = this._maps[i].map(pos, assoc);
      return pos;
    }
    mapResult(pos, assoc = 1) {
      return this._map(pos, assoc, false);
    }
    _map(pos, assoc, simple) {
      let delInfo = 0;
      for (let i = this.from;i < this.to; i++) {
        let map = this._maps[i], result = map.mapResult(pos, assoc);
        if (result.recover != null) {
          let corr = this.getMirror(i);
          if (corr != null && corr > i && corr < this.to) {
            i = corr;
            pos = this._maps[corr].recover(result.recover);
            continue;
          }
        }
        delInfo |= result.delInfo;
        pos = result.pos;
      }
      return simple ? pos : new MapResult(pos, delInfo, null);
    }
  }
  var stepsByID = Object.create(null);

  class Step {
    getMap() {
      return StepMap.empty;
    }
    merge(other) {
      return null;
    }
    static fromJSON(schema, json) {
      if (!json || !json.stepType)
        throw new RangeError("Invalid input for Step.fromJSON");
      let type = stepsByID[json.stepType];
      if (!type)
        throw new RangeError(`No step type ${json.stepType} defined`);
      return type.fromJSON(schema, json);
    }
    static jsonID(id, stepClass) {
      if (id in stepsByID)
        throw new RangeError("Duplicate use of step JSON ID " + id);
      stepsByID[id] = stepClass;
      stepClass.prototype.jsonID = id;
      return stepClass;
    }
  }

  class StepResult {
    constructor(doc, failed) {
      this.doc = doc;
      this.failed = failed;
    }
    static ok(doc) {
      return new StepResult(doc, null);
    }
    static fail(message) {
      return new StepResult(null, message);
    }
    static fromReplace(doc, from, to, slice) {
      try {
        return StepResult.ok(doc.replace(from, to, slice));
      } catch (e) {
        if (e instanceof ReplaceError)
          return StepResult.fail(e.message);
        throw e;
      }
    }
  }
  function mapFragment(fragment, f, parent) {
    let mapped = [];
    for (let i = 0;i < fragment.childCount; i++) {
      let child = fragment.child(i);
      if (child.content.size)
        child = child.copy(mapFragment(child.content, f, child));
      if (child.isInline)
        child = f(child, parent, i);
      mapped.push(child);
    }
    return Fragment.fromArray(mapped);
  }

  class AddMarkStep extends Step {
    constructor(from, to, mark) {
      super();
      this.from = from;
      this.to = to;
      this.mark = mark;
    }
    apply(doc) {
      let oldSlice = doc.slice(this.from, this.to), $from = doc.resolve(this.from);
      let parent = $from.node($from.sharedDepth(this.to));
      let slice = new Slice(mapFragment(oldSlice.content, (node, parent2) => {
        if (!node.isAtom || !parent2.type.allowsMarkType(this.mark.type))
          return node;
        return node.mark(this.mark.addToSet(node.marks));
      }, parent), oldSlice.openStart, oldSlice.openEnd);
      return StepResult.fromReplace(doc, this.from, this.to, slice);
    }
    invert(doc) {
      let steps = [];
      doc.nodesBetween(this.from, this.to, (node, pos) => {
        if (node.isInline && node.isAtom) {
          let added = this.mark.addToSet(node.marks);
          if (!Mark.sameSet(added, node.marks)) {
            let from = Math.max(this.from, pos), to = Math.min(this.to, pos + node.nodeSize);
            pushMarkStep(RemoveMarkStep, from, to, this.mark, steps);
            for (let mark of node.marks)
              if (!mark.isInSet(added))
                pushMarkStep(AddMarkStep, from, to, mark, steps);
          }
        }
      });
      return steps.length == 1 ? steps[0] : new MarkSetStep(steps);
    }
    map(mapping) {
      let from = mapping.map(this.from, 1), to = mapping.map(this.to, -1);
      if (from >= to)
        return null;
      return new AddMarkStep(from, to, this.mark);
    }
    merge(other) {
      if (other instanceof AddMarkStep && other.mark.eq(this.mark) && this.from <= other.to && this.to >= other.from)
        return new AddMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
      return null;
    }
    toJSON() {
      return {
        stepType: "addMark",
        mark: this.mark.toJSON(),
        from: this.from,
        to: this.to
      };
    }
    static fromJSON(schema, json) {
      if (typeof json.from != "number" || typeof json.to != "number")
        throw new RangeError("Invalid input for AddMarkStep.fromJSON");
      return new AddMarkStep(json.from, json.to, schema.markFromJSON(json.mark));
    }
  }
  Step.jsonID("addMark", AddMarkStep);

  class RemoveMarkStep extends Step {
    constructor(from, to, mark) {
      super();
      this.from = from;
      this.to = to;
      this.mark = mark;
    }
    apply(doc) {
      let oldSlice = doc.slice(this.from, this.to);
      let slice = new Slice(mapFragment(oldSlice.content, (node) => {
        return node.mark(this.mark.removeFromSet(node.marks));
      }, doc), oldSlice.openStart, oldSlice.openEnd);
      return StepResult.fromReplace(doc, this.from, this.to, slice);
    }
    invert(doc) {
      let steps = [];
      doc.nodesBetween(this.from, this.to, (node, pos) => {
        if (node.isInline && node.isAtom && this.mark.isInSet(node.marks))
          pushMarkStep(AddMarkStep, Math.max(this.from, pos), Math.min(this.to, pos + node.nodeSize), this.mark, steps);
      });
      return steps.length == 1 ? steps[0] : new MarkSetStep(steps);
    }
    map(mapping) {
      let from = mapping.map(this.from, 1), to = mapping.map(this.to, -1);
      if (from >= to)
        return null;
      return new RemoveMarkStep(from, to, this.mark);
    }
    merge(other) {
      if (other instanceof RemoveMarkStep && other.mark.eq(this.mark) && this.from <= other.to && this.to >= other.from)
        return new RemoveMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
      return null;
    }
    toJSON() {
      return {
        stepType: "removeMark",
        mark: this.mark.toJSON(),
        from: this.from,
        to: this.to
      };
    }
    static fromJSON(schema, json) {
      if (typeof json.from != "number" || typeof json.to != "number")
        throw new RangeError("Invalid input for RemoveMarkStep.fromJSON");
      return new RemoveMarkStep(json.from, json.to, schema.markFromJSON(json.mark));
    }
  }
  Step.jsonID("removeMark", RemoveMarkStep);
  function pushMarkStep(cls, from, to, mark, target) {
    let last = target.length ? target[target.length - 1] : null;
    if (last && last instanceof cls && last.to == from && last.mark.eq(mark)) {
      target[target.length - 1] = new cls(last.from, to, mark);
    } else {
      target.push(new cls(from, to, mark));
    }
  }

  class MarkSetStep extends Step {
    constructor(steps) {
      super();
      this.steps = steps;
    }
    apply(doc) {
      for (let step of this.steps) {
        let result = step.apply(doc);
        if (!result.doc)
          return result;
        doc = result.doc;
      }
      return new StepResult(doc, null);
    }
    invert(doc) {
      return new MarkSetStep(this.steps.map((s) => s.invert(doc)));
    }
    map(mapping) {
      let result = [];
      for (let step of this.steps) {
        let mapped = step.map(mapping);
        if (mapped)
          result.push(mapped);
      }
      return result.length ? new MarkSetStep(result) : null;
    }
    toJSON() {
      return { stepType: "markSet", steps: this.steps.map((s) => s.toJSON()) };
    }
    static fromJSON(schema, json) {
      if (!Array.isArray(json.steps) || !json.steps.every((s) => s.stepType == "addMark" || s.stepType == "removeMark"))
        throw new RangeError("Invalid JSON for MarkSetStep");
      return new MarkSetStep(json.steps.map((s) => Step.fromJSON(schema, s)));
    }
  }
  Step.jsonID("markSet", MarkSetStep);

  class AddNodeMarkStep extends Step {
    constructor(pos, mark) {
      super();
      this.pos = pos;
      this.mark = mark;
    }
    apply(doc) {
      let node = doc.nodeAt(this.pos);
      if (!node)
        return StepResult.fail("No node at mark step's position");
      let updated = node.type.create(node.attrs, null, this.mark.addToSet(node.marks));
      return StepResult.fromReplace(doc, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
    }
    invert(doc) {
      let node = doc.nodeAt(this.pos);
      if (node) {
        let newSet = this.mark.addToSet(node.marks);
        if (newSet.length == node.marks.length) {
          for (let i = 0;i < node.marks.length; i++)
            if (!node.marks[i].isInSet(newSet))
              return new AddNodeMarkStep(this.pos, node.marks[i]);
          return new AddNodeMarkStep(this.pos, this.mark);
        }
      }
      return new RemoveNodeMarkStep(this.pos, this.mark);
    }
    map(mapping) {
      let pos = mapping.mapResult(this.pos, 1);
      return pos.deletedAfter ? null : new AddNodeMarkStep(pos.pos, this.mark);
    }
    toJSON() {
      return { stepType: "addNodeMark", pos: this.pos, mark: this.mark.toJSON() };
    }
    static fromJSON(schema, json) {
      if (typeof json.pos != "number")
        throw new RangeError("Invalid input for AddNodeMarkStep.fromJSON");
      return new AddNodeMarkStep(json.pos, schema.markFromJSON(json.mark));
    }
  }
  Step.jsonID("addNodeMark", AddNodeMarkStep);

  class RemoveNodeMarkStep extends Step {
    constructor(pos, mark) {
      super();
      this.pos = pos;
      this.mark = mark;
    }
    apply(doc) {
      let node = doc.nodeAt(this.pos);
      if (!node)
        return StepResult.fail("No node at mark step's position");
      let updated = node.type.create(node.attrs, null, this.mark.removeFromSet(node.marks));
      return StepResult.fromReplace(doc, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
    }
    invert(doc) {
      let node = doc.nodeAt(this.pos);
      if (!node || !this.mark.isInSet(node.marks))
        return this;
      return new AddNodeMarkStep(this.pos, this.mark);
    }
    map(mapping) {
      let pos = mapping.mapResult(this.pos, 1);
      return pos.deletedAfter ? null : new RemoveNodeMarkStep(pos.pos, this.mark);
    }
    toJSON() {
      return { stepType: "removeNodeMark", pos: this.pos, mark: this.mark.toJSON() };
    }
    static fromJSON(schema, json) {
      if (typeof json.pos != "number")
        throw new RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
      return new RemoveNodeMarkStep(json.pos, schema.markFromJSON(json.mark));
    }
  }
  Step.jsonID("removeNodeMark", RemoveNodeMarkStep);

  class ReplaceStep extends Step {
    constructor(from, to, slice, structure = false) {
      super();
      this.from = from;
      this.to = to;
      this.slice = slice;
      this.structure = structure;
    }
    apply(doc) {
      if (this.structure && contentBetween(doc, this.from, this.to))
        return StepResult.fail("Structure replace would overwrite content");
      return StepResult.fromReplace(doc, this.from, this.to, this.slice);
    }
    getMap() {
      return new StepMap([this.from, this.to - this.from, this.slice.size]);
    }
    invert(doc) {
      return new ReplaceStep(this.from, this.from + this.slice.size, doc.slice(this.from, this.to));
    }
    map(mapping) {
      let to = mapping.mapResult(this.to, -1);
      let from = this.from == this.to && ReplaceStep.MAP_BIAS < 0 ? to : mapping.mapResult(this.from, 1);
      if (from.deletedAcross && to.deletedAcross)
        return null;
      return new ReplaceStep(from.pos, Math.max(from.pos, to.pos), this.slice, this.structure);
    }
    merge(other) {
      if (!(other instanceof ReplaceStep) || other.structure || this.structure)
        return null;
      if (this.from + this.slice.size == other.from && !this.slice.openEnd && !other.slice.openStart) {
        let slice = this.slice.size + other.slice.size == 0 ? Slice.empty : new Slice(this.slice.content.append(other.slice.content), this.slice.openStart, other.slice.openEnd);
        return new ReplaceStep(this.from, this.to + (other.to - other.from), slice, this.structure);
      } else if (other.to == this.from && !this.slice.openStart && !other.slice.openEnd) {
        let slice = this.slice.size + other.slice.size == 0 ? Slice.empty : new Slice(other.slice.content.append(this.slice.content), other.slice.openStart, this.slice.openEnd);
        return new ReplaceStep(other.from, this.to, slice, this.structure);
      } else {
        return null;
      }
    }
    toJSON() {
      let json = { stepType: "replace", from: this.from, to: this.to };
      if (this.slice.size)
        json.slice = this.slice.toJSON();
      if (this.structure)
        json.structure = true;
      return json;
    }
    static fromJSON(schema, json) {
      if (typeof json.from != "number" || typeof json.to != "number")
        throw new RangeError("Invalid input for ReplaceStep.fromJSON");
      return new ReplaceStep(json.from, json.to, Slice.fromJSON(schema, json.slice), !!json.structure);
    }
  }
  ReplaceStep.MAP_BIAS = 1;
  Step.jsonID("replace", ReplaceStep);

  class ReplaceAroundStep extends Step {
    constructor(from, to, gapFrom, gapTo, slice, insert, structure = false) {
      super();
      this.from = from;
      this.to = to;
      this.gapFrom = gapFrom;
      this.gapTo = gapTo;
      this.slice = slice;
      this.insert = insert;
      this.structure = structure;
    }
    apply(doc) {
      if (this.structure && (contentBetween(doc, this.from, this.gapFrom) || contentBetween(doc, this.gapTo, this.to)))
        return StepResult.fail("Structure gap-replace would overwrite content");
      let gap = doc.slice(this.gapFrom, this.gapTo);
      if (gap.openStart || gap.openEnd)
        return StepResult.fail("Gap is not a flat range");
      let inserted = this.slice.insertAt(this.insert, gap.content);
      if (!inserted)
        return StepResult.fail("Content does not fit in gap");
      return StepResult.fromReplace(doc, this.from, this.to, inserted);
    }
    getMap() {
      return new StepMap([
        this.from,
        this.gapFrom - this.from,
        this.insert,
        this.gapTo,
        this.to - this.gapTo,
        this.slice.size - this.insert
      ]);
    }
    invert(doc) {
      let gap = this.gapTo - this.gapFrom;
      return new ReplaceAroundStep(this.from, this.from + this.slice.size + gap, this.from + this.insert, this.from + this.insert + gap, doc.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
    }
    map(mapping) {
      let from = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
      let gapFrom = this.from == this.gapFrom ? from.pos : mapping.map(this.gapFrom, -1);
      let gapTo = this.to == this.gapTo ? to.pos : mapping.map(this.gapTo, 1);
      if (from.deletedAcross && to.deletedAcross || gapFrom < from.pos || gapTo > to.pos || gapFrom > gapTo)
        return null;
      return new ReplaceAroundStep(from.pos, to.pos, gapFrom, gapTo, this.slice, this.insert, this.structure);
    }
    toJSON() {
      let json = {
        stepType: "replaceAround",
        from: this.from,
        to: this.to,
        gapFrom: this.gapFrom,
        gapTo: this.gapTo,
        insert: this.insert
      };
      if (this.slice.size)
        json.slice = this.slice.toJSON();
      if (this.structure)
        json.structure = true;
      return json;
    }
    static fromJSON(schema, json) {
      if (typeof json.from != "number" || typeof json.to != "number" || typeof json.gapFrom != "number" || typeof json.gapTo != "number" || typeof json.insert != "number")
        throw new RangeError("Invalid input for ReplaceAroundStep.fromJSON");
      return new ReplaceAroundStep(json.from, json.to, json.gapFrom, json.gapTo, Slice.fromJSON(schema, json.slice), json.insert, !!json.structure);
    }
  }
  Step.jsonID("replaceAround", ReplaceAroundStep);
  function contentBetween(doc, from, to) {
    let $from = doc.resolve(from), dist = to - from, depth = $from.depth;
    while (dist > 0 && depth > 0 && $from.indexAfter(depth) == $from.node(depth).childCount) {
      depth--;
      dist--;
    }
    if (dist > 0) {
      let next = $from.node(depth).maybeChild($from.indexAfter(depth));
      while (dist > 0) {
        if (!next || next.isLeaf)
          return true;
        next = next.firstChild;
        dist--;
      }
    }
    return false;
  }
  function addMark(tr, from, to, mark) {
    let added = [];
    tr.doc.nodesBetween(from, to, (node, pos, parent) => {
      if (!node.isInline)
        return;
      let marks = node.marks;
      if (!mark.isInSet(marks) && parent.type.allowsMarkType(mark.type)) {
        let start = Math.max(pos, from), end = Math.min(pos + node.nodeSize, to);
        pushMarkStep(AddMarkStep, start, end, mark, added);
      }
    });
    added.forEach((s) => tr.step(s));
  }
  function removeMark(tr, from, to, mark) {
    let matched = [], step = 0;
    tr.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isInline || !node.isAtom)
        return;
      step++;
      let toRemove = null;
      if (mark instanceof MarkType) {
        let set = node.marks, found2;
        while (found2 = mark.isInSet(set)) {
          (toRemove || (toRemove = [])).push(found2);
          set = found2.removeFromSet(set);
        }
      } else if (mark) {
        if (mark.isInSet(node.marks))
          toRemove = [mark];
      } else {
        toRemove = node.marks;
      }
      if (toRemove && toRemove.length) {
        let end = Math.min(pos + node.nodeSize, to);
        for (let i = 0;i < toRemove.length; i++) {
          let style = toRemove[i], found2;
          for (let j = 0;j < matched.length; j++) {
            let m = matched[j];
            if (m.step == step - 1 && style.eq(matched[j].style))
              found2 = m;
          }
          if (found2) {
            found2.to = end;
            found2.step = step;
          } else {
            matched.push({ style, from: Math.max(pos, from), to: end, step });
          }
        }
      }
    });
    matched.forEach((m) => tr.step(new RemoveMarkStep(m.from, m.to, m.style)));
  }
  function clearIncompatible(tr, pos, parentType, match = parentType.contentMatch, clearNewlines = true) {
    let node = tr.doc.nodeAt(pos);
    let replSteps = [], cur = pos + 1;
    for (let i = 0;i < node.childCount; i++) {
      let child = node.child(i), end = cur + child.nodeSize;
      let allowed = match.matchType(child.type);
      if (!allowed) {
        replSteps.push(new ReplaceStep(cur, end, Slice.empty));
      } else {
        match = allowed;
        for (let j = 0;j < child.marks.length; j++)
          if (!parentType.allowsMarkType(child.marks[j].type))
            tr.step(new RemoveMarkStep(cur, end, child.marks[j]));
        if (clearNewlines && child.isText && parentType.whitespace != "pre") {
          let m, newline = /\r?\n|\r/g, slice;
          while (m = newline.exec(child.text)) {
            if (!slice)
              slice = new Slice(Fragment.from(parentType.schema.text(" ", parentType.allowedMarks(child.marks))), 0, 0);
            replSteps.push(new ReplaceStep(cur + m.index, cur + m.index + m[0].length, slice));
          }
        }
      }
      cur = end;
    }
    if (!match.validEnd) {
      let fill = match.fillBefore(Fragment.empty, true);
      tr.replace(cur, cur, new Slice(fill, 0, 0));
    }
    for (let i = replSteps.length - 1;i >= 0; i--)
      tr.step(replSteps[i]);
  }
  function canCut(node, start, end) {
    return (start == 0 || node.canReplace(start, node.childCount)) && (end == node.childCount || node.canReplace(0, end));
  }
  function liftTarget(range) {
    let parent = range.parent;
    let content = parent.content.cutByIndex(range.startIndex, range.endIndex);
    for (let depth = range.depth, contentBefore = 0, contentAfter = 0;; --depth) {
      let node = range.$from.node(depth);
      let index = range.$from.index(depth) + contentBefore, endIndex = range.$to.indexAfter(depth) - contentAfter;
      if (depth < range.depth && node.canReplace(index, endIndex, content))
        return depth;
      if (depth == 0 || node.type.spec.isolating || !canCut(node, index, endIndex))
        break;
      if (index)
        contentBefore = 1;
      if (endIndex < node.childCount)
        contentAfter = 1;
    }
    return null;
  }
  function lift(tr, range, target) {
    let { $from, $to, depth } = range;
    let gapStart = $from.before(depth + 1), gapEnd = $to.after(depth + 1);
    let start = gapStart, end = gapEnd;
    let before = Fragment.empty, openStart = 0;
    for (let d = depth, splitting = false;d > target; d--)
      if (splitting || $from.index(d) > 0) {
        splitting = true;
        before = Fragment.from($from.node(d).copy(before));
        openStart++;
      } else {
        start--;
      }
    let after = Fragment.empty, openEnd = 0;
    for (let d = depth, splitting = false;d > target; d--)
      if (splitting || $to.after(d + 1) < $to.end(d)) {
        splitting = true;
        after = Fragment.from($to.node(d).copy(after));
        openEnd++;
      } else {
        end++;
      }
    tr.step(new ReplaceAroundStep(start, end, gapStart, gapEnd, new Slice(before.append(after), openStart, openEnd), before.size - openStart, true));
  }
  function findWrapping(range, nodeType, attrs = null, innerRange = range) {
    let around = findWrappingOutside(range, nodeType);
    let inner = around && findWrappingInside(innerRange, nodeType);
    if (!inner)
      return null;
    return around.map(withAttrs).concat({ type: nodeType, attrs }).concat(inner.map(withAttrs));
  }
  function withAttrs(type) {
    return { type, attrs: null };
  }
  function findWrappingOutside(range, type) {
    let { parent, startIndex, endIndex } = range;
    let around = parent.contentMatchAt(startIndex).findWrapping(type);
    if (!around)
      return null;
    let outer = around.length ? around[0] : type;
    return parent.canReplaceWith(startIndex, endIndex, outer) ? around : null;
  }
  function findWrappingInside(range, type) {
    let { parent, startIndex, endIndex } = range;
    let inner = parent.child(startIndex);
    let inside = type.contentMatch.findWrapping(inner.type);
    if (!inside)
      return null;
    let lastType = inside.length ? inside[inside.length - 1] : type;
    let innerMatch = lastType.contentMatch;
    for (let i = startIndex;innerMatch && i < endIndex; i++)
      innerMatch = innerMatch.matchType(parent.child(i).type);
    if (!innerMatch || !innerMatch.validEnd)
      return null;
    return inside;
  }
  function wrap(tr, range, wrappers) {
    let content = Fragment.empty;
    for (let i = wrappers.length - 1;i >= 0; i--) {
      if (content.size) {
        let match = wrappers[i].type.contentMatch.matchFragment(content);
        if (!match || !match.validEnd)
          throw new RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
      }
      content = Fragment.from(wrappers[i].type.create(wrappers[i].attrs, content));
    }
    let { start, end } = range;
    tr.step(new ReplaceAroundStep(start, end, start, end, new Slice(content, 0, 0), wrappers.length, true));
  }
  function setBlockType(tr, from, to, type, attrs) {
    if (!type.isTextblock)
      throw new RangeError("Type given to setBlockType should be a textblock");
    let mapFrom = tr.steps.length;
    tr.doc.nodesBetween(from, to, (node, pos) => {
      let attrsHere = typeof attrs == "function" ? attrs(node) : attrs;
      if (node.isTextblock && !node.hasMarkup(type, attrsHere) && canChangeType(tr.doc, tr.mapping.slice(mapFrom).map(pos), type)) {
        let convertNewlines = null;
        if (type.schema.linebreakReplacement) {
          let pre = type.whitespace == "pre", supportLinebreak = !!type.contentMatch.matchType(type.schema.linebreakReplacement);
          if (pre && !supportLinebreak)
            convertNewlines = false;
          else if (!pre && supportLinebreak)
            convertNewlines = true;
        }
        if (convertNewlines === false)
          replaceLinebreaks(tr, node, pos, mapFrom);
        clearIncompatible(tr, tr.mapping.slice(mapFrom).map(pos, 1), type, undefined, convertNewlines === null);
        let mapping = tr.mapping.slice(mapFrom);
        let startM = mapping.map(pos, 1), endM = mapping.map(pos + node.nodeSize, 1);
        tr.step(new ReplaceAroundStep(startM, endM, startM + 1, endM - 1, new Slice(Fragment.from(type.create(attrsHere, null, node.marks)), 0, 0), 1, true));
        if (convertNewlines === true)
          replaceNewlines(tr, node, pos, mapFrom);
        return false;
      }
    });
  }
  function replaceNewlines(tr, node, pos, mapFrom) {
    node.forEach((child, offset) => {
      if (child.isText) {
        let m, newline = /\r?\n|\r/g;
        while (m = newline.exec(child.text)) {
          let start = tr.mapping.slice(mapFrom).map(pos + 1 + offset + m.index);
          tr.replaceWith(start, start + 1, node.type.schema.linebreakReplacement.create());
        }
      }
    });
  }
  function replaceLinebreaks(tr, node, pos, mapFrom) {
    node.forEach((child, offset) => {
      if (child.type == child.type.schema.linebreakReplacement) {
        let start = tr.mapping.slice(mapFrom).map(pos + 1 + offset);
        tr.replaceWith(start, start + 1, node.type.schema.text(`
`));
      }
    });
  }
  function canChangeType(doc, pos, type) {
    let $pos = doc.resolve(pos), index = $pos.index();
    return $pos.parent.canReplaceWith(index, index + 1, type);
  }
  function setNodeMarkup(tr, pos, type, attrs, marks) {
    let node = tr.doc.nodeAt(pos);
    if (!node)
      throw new RangeError("No node at given position");
    if (!type)
      type = node.type;
    let newNode = type.create(attrs, null, marks || node.marks);
    if (node.isLeaf)
      return tr.replaceWith(pos, pos + node.nodeSize, newNode);
    if (!type.validContent(node.content))
      throw new RangeError("Invalid content for node type " + type.name);
    tr.step(new ReplaceAroundStep(pos, pos + node.nodeSize, pos + 1, pos + node.nodeSize - 1, new Slice(Fragment.from(newNode), 0, 0), 1, true));
  }
  function canSplit(doc, pos, depth = 1, typesAfter) {
    let $pos = doc.resolve(pos), base = $pos.depth - depth;
    let innerType = typesAfter && typesAfter[typesAfter.length - 1] || $pos.parent;
    if (base < 0 || $pos.parent.type.spec.isolating || !$pos.parent.canReplace($pos.index(), $pos.parent.childCount) || !innerType.type.validContent($pos.parent.content.cutByIndex($pos.index(), $pos.parent.childCount)))
      return false;
    for (let d = $pos.depth - 1, i = depth - 2;d > base; d--, i--) {
      let node = $pos.node(d), index2 = $pos.index(d);
      if (node.type.spec.isolating)
        return false;
      let rest = node.content.cutByIndex(index2, node.childCount);
      let overrideChild = typesAfter && typesAfter[i + 1];
      if (overrideChild)
        rest = rest.replaceChild(0, overrideChild.type.create(overrideChild.attrs));
      let after = typesAfter && typesAfter[i] || node;
      if (!node.canReplace(index2 + 1, node.childCount) || !after.type.validContent(rest))
        return false;
    }
    let index = $pos.indexAfter(base);
    let baseType = typesAfter && typesAfter[0];
    return $pos.node(base).canReplaceWith(index, index, baseType ? baseType.type : $pos.node(base + 1).type);
  }
  function split(tr, pos, depth = 1, typesAfter) {
    let $pos = tr.doc.resolve(pos), before = Fragment.empty, after = Fragment.empty;
    for (let d = $pos.depth, e = $pos.depth - depth, i = depth - 1;d > e; d--, i--) {
      before = Fragment.from($pos.node(d).copy(before));
      let typeAfter = typesAfter && typesAfter[i];
      after = Fragment.from(typeAfter ? typeAfter.type.create(typeAfter.attrs, after) : $pos.node(d).copy(after));
    }
    tr.step(new ReplaceStep(pos, pos, new Slice(before.append(after), depth, depth), true));
  }
  function canJoin(doc, pos) {
    let $pos = doc.resolve(pos), index = $pos.index();
    return joinable2($pos.nodeBefore, $pos.nodeAfter) && $pos.parent.canReplace(index, index + 1);
  }
  function canAppendWithSubstitutedLinebreaks(a, b) {
    if (!b.content.size)
      a.type.compatibleContent(b.type);
    let match = a.contentMatchAt(a.childCount);
    let { linebreakReplacement } = a.type.schema;
    for (let i = 0;i < b.childCount; i++) {
      let child = b.child(i);
      let type = child.type == linebreakReplacement ? a.type.schema.nodes.text : child.type;
      match = match.matchType(type);
      if (!match)
        return false;
      if (!a.type.allowsMarks(child.marks))
        return false;
    }
    return match.validEnd;
  }
  function joinable2(a, b) {
    return !!(a && b && !a.isLeaf && canAppendWithSubstitutedLinebreaks(a, b));
  }
  function joinPoint(doc, pos, dir = -1) {
    let $pos = doc.resolve(pos);
    for (let d = $pos.depth;; d--) {
      let before, after, index = $pos.index(d);
      if (d == $pos.depth) {
        before = $pos.nodeBefore;
        after = $pos.nodeAfter;
      } else if (dir > 0) {
        before = $pos.node(d + 1);
        index++;
        after = $pos.node(d).maybeChild(index);
      } else {
        before = $pos.node(d).maybeChild(index - 1);
        after = $pos.node(d + 1);
      }
      if (before && !before.isTextblock && joinable2(before, after) && $pos.node(d).canReplace(index, index + 1))
        return pos;
      if (d == 0)
        break;
      pos = dir < 0 ? $pos.before(d) : $pos.after(d);
    }
  }
  function join(tr, pos, depth) {
    let convertNewlines = null;
    let { linebreakReplacement } = tr.doc.type.schema;
    let $before = tr.doc.resolve(pos - depth), beforeType = $before.node().type;
    if (linebreakReplacement && beforeType.inlineContent) {
      let pre = beforeType.whitespace == "pre";
      let supportLinebreak = !!beforeType.contentMatch.matchType(linebreakReplacement);
      if (pre && !supportLinebreak)
        convertNewlines = false;
      else if (!pre && supportLinebreak)
        convertNewlines = true;
    }
    let mapFrom = tr.steps.length;
    if (convertNewlines === false) {
      let $after = tr.doc.resolve(pos + depth);
      replaceLinebreaks(tr, $after.node(), $after.before(), mapFrom);
    }
    if (beforeType.inlineContent)
      clearIncompatible(tr, pos + depth - 1, beforeType, $before.node().contentMatchAt($before.index()), convertNewlines == null);
    let mapping = tr.mapping.slice(mapFrom), start = mapping.map(pos - depth);
    tr.step(new ReplaceStep(start, mapping.map(pos + depth, -1), Slice.empty, true));
    if (convertNewlines === true) {
      let $full = tr.doc.resolve(start);
      replaceNewlines(tr, $full.node(), $full.before(), tr.steps.length);
    }
    return tr;
  }
  function insertPoint(doc, pos, nodeType) {
    let $pos = doc.resolve(pos);
    if ($pos.parent.canReplaceWith($pos.index(), $pos.index(), nodeType))
      return pos;
    if ($pos.parentOffset == 0)
      for (let d = $pos.depth - 1;d >= 0; d--) {
        let index = $pos.index(d);
        if ($pos.node(d).canReplaceWith(index, index, nodeType))
          return $pos.before(d + 1);
        if (index > 0)
          return null;
      }
    if ($pos.parentOffset == $pos.parent.content.size)
      for (let d = $pos.depth - 1;d >= 0; d--) {
        let index = $pos.indexAfter(d);
        if ($pos.node(d).canReplaceWith(index, index, nodeType))
          return $pos.after(d + 1);
        if (index < $pos.node(d).childCount)
          return null;
      }
    return null;
  }
  function replaceStep(doc, from, to = from, slice = Slice.empty) {
    if (from == to && !slice.size)
      return null;
    let $from = doc.resolve(from), $to = doc.resolve(to);
    if (fitsTrivially($from, $to, slice))
      return new ReplaceStep(from, to, slice);
    return new Fitter($from, $to, slice).fit();
  }
  function fitsTrivially($from, $to, slice) {
    return !slice.openStart && !slice.openEnd && $from.start() == $to.start() && $from.parent.canReplace($from.index(), $to.index(), slice.content);
  }

  class Fitter {
    constructor($from, $to, unplaced) {
      this.$from = $from;
      this.$to = $to;
      this.unplaced = unplaced;
      this.frontier = [];
      this.placed = Fragment.empty;
      for (let i = 0;i <= $from.depth; i++) {
        let node = $from.node(i);
        this.frontier.push({
          type: node.type,
          match: node.contentMatchAt($from.indexAfter(i))
        });
      }
      for (let i = $from.depth;i > 0; i--)
        this.placed = Fragment.from($from.node(i).copy(this.placed));
    }
    get depth() {
      return this.frontier.length - 1;
    }
    fit() {
      while (this.unplaced.size) {
        let fit = this.findFittable();
        if (fit)
          this.placeNodes(fit);
        else
          this.openMore() || this.dropNode();
      }
      let moveInline = this.mustMoveInline(), placedSize = this.placed.size - this.depth - this.$from.depth;
      let $from = this.$from, $to = this.close(moveInline < 0 ? this.$to : $from.doc.resolve(moveInline));
      if (!$to)
        return null;
      let content = this.placed, openStart = $from.depth, openEnd = $to.depth;
      while (openStart && openEnd && content.childCount == 1) {
        content = content.firstChild.content;
        openStart--;
        openEnd--;
      }
      let slice = new Slice(content, openStart, openEnd);
      if (moveInline > -1)
        return new ReplaceAroundStep($from.pos, moveInline, this.$to.pos, this.$to.end(), slice, placedSize);
      if (slice.size || $from.pos != this.$to.pos)
        return new ReplaceStep($from.pos, $to.pos, slice);
      return null;
    }
    findFittable() {
      let startDepth = this.unplaced.openStart;
      for (let cur = this.unplaced.content, d = 0, openEnd = this.unplaced.openEnd;d < startDepth; d++) {
        let node = cur.firstChild;
        if (cur.childCount > 1)
          openEnd = 0;
        if (node.type.spec.isolating && openEnd <= d) {
          startDepth = d;
          break;
        }
        cur = node.content;
      }
      for (let pass = 1;pass <= 2; pass++) {
        for (let sliceDepth = pass == 1 ? startDepth : this.unplaced.openStart;sliceDepth >= 0; sliceDepth--) {
          let fragment, parent = null;
          if (sliceDepth) {
            parent = contentAt(this.unplaced.content, sliceDepth - 1).firstChild;
            fragment = parent.content;
          } else {
            fragment = this.unplaced.content;
          }
          let first = fragment.firstChild;
          for (let frontierDepth = this.depth;frontierDepth >= 0; frontierDepth--) {
            let { type, match } = this.frontier[frontierDepth], wrap2, inject = null;
            if (pass == 1 && (first ? match.matchType(first.type) || (inject = match.fillBefore(Fragment.from(first), false)) : parent && type.compatibleContent(parent.type)))
              return { sliceDepth, frontierDepth, parent, inject };
            else if (pass == 2 && first && (wrap2 = match.findWrapping(first.type)))
              return { sliceDepth, frontierDepth, parent, wrap: wrap2 };
            if (parent && match.matchType(parent.type))
              break;
          }
        }
      }
    }
    openMore() {
      let { content, openStart, openEnd } = this.unplaced;
      if (maxOpen(content, -1) <= openStart)
        return false;
      if (this.unplaced.size > 1 && maxOpen(content, 1) > openEnd)
        openEnd++;
      this.unplaced = new Slice(content, openStart + 1, openEnd);
      return true;
    }
    dropNode() {
      let { content, openStart, openEnd } = this.unplaced;
      let inner = contentAt(content, openStart);
      if (inner.childCount <= 1 && openStart > 0) {
        let openAtEnd = content.size - openStart <= openStart + inner.size;
        this.unplaced = new Slice(dropFromFragment(content, openStart - 1, 1), openStart - 1, openAtEnd ? openStart - 1 : openEnd);
      } else {
        this.unplaced = new Slice(dropFromFragment(content, openStart, 1), openStart, openEnd);
      }
    }
    placeNodes({ sliceDepth, frontierDepth, parent, inject, wrap: wrap2 }) {
      while (this.depth > frontierDepth)
        this.closeFrontierNode();
      if (wrap2)
        for (let i = 0;i < wrap2.length; i++)
          this.openFrontierNode(wrap2[i]);
      let slice = this.unplaced, fragment = parent ? parent.content : slice.content;
      let openStart = slice.openStart - sliceDepth;
      let taken = 0, add = [];
      let { match, type } = this.frontier[frontierDepth];
      if (inject) {
        for (let i = 0;i < inject.childCount; i++)
          add.push(inject.child(i));
        match = match.matchFragment(inject);
      }
      let openEndCount = fragment.size + sliceDepth - (slice.content.size - slice.openEnd);
      while (taken < fragment.childCount) {
        let next = fragment.child(taken), matches = match.matchType(next.type);
        if (!matches)
          break;
        taken++;
        if (taken > 1 || openStart == 0 || next.content.size) {
          match = matches;
          add.push(closeNodeStart(next.mark(type.allowedMarks(next.marks)), taken == 1 ? openStart : 0, taken == fragment.childCount ? openEndCount : -1));
        }
      }
      let toEnd = taken == fragment.childCount;
      if (!toEnd)
        openEndCount = -1;
      this.placed = addToFragment(this.placed, frontierDepth, Fragment.from(add));
      this.frontier[frontierDepth].match = match;
      if (toEnd && openEndCount < 0 && parent && parent.type == this.frontier[this.depth].type && this.frontier.length > 1)
        this.closeFrontierNode();
      for (let i = 0, cur = add[add.length - 1];cur && i < openEndCount; i++) {
        this.frontier.push({ type: cur.type, match: cur.contentMatchAt(cur.childCount) });
        cur = cur.lastChild;
      }
      this.unplaced = !toEnd ? new Slice(dropFromFragment(slice.content, sliceDepth, taken), sliceDepth, slice.openEnd) : sliceDepth == 0 ? Slice.empty : new Slice(dropFromFragment(slice.content, sliceDepth - 1, 1), sliceDepth - 1, openEndCount < 0 ? slice.openEnd : sliceDepth - 1);
    }
    mustMoveInline() {
      if (!this.$to.parent.isTextblock)
        return -1;
      let top = this.frontier[this.depth], level;
      if (!top.type.isTextblock || !contentAfterFits(this.$to, this.$to.depth, top.type, top.match, false) || this.$to.depth == this.depth && (level = this.findCloseLevel(this.$to)) && level.depth == this.depth)
        return -1;
      let { depth } = this.$to, after = this.$to.after(depth);
      while (depth > 1 && after == this.$to.end(--depth))
        ++after;
      return after;
    }
    findCloseLevel($to) {
      scan:
        for (let i = Math.min(this.depth, $to.depth);i >= 0; i--) {
          let { match, type } = this.frontier[i];
          let dropInner = i < $to.depth && $to.end(i + 1) == $to.pos + ($to.depth - (i + 1));
          let fit = contentAfterFits($to, i, type, match, dropInner);
          if (!fit)
            continue;
          for (let d = i - 1;d >= 0; d--) {
            let { match: match2, type: type2 } = this.frontier[d];
            let matches = contentAfterFits($to, d, type2, match2, true);
            if (!matches || matches.childCount)
              continue scan;
          }
          return { depth: i, fit, move: dropInner ? $to.doc.resolve($to.after(i + 1)) : $to };
        }
    }
    close($to) {
      let close2 = this.findCloseLevel($to);
      if (!close2)
        return null;
      while (this.depth > close2.depth)
        this.closeFrontierNode();
      if (close2.fit.childCount)
        this.placed = addToFragment(this.placed, close2.depth, close2.fit);
      $to = close2.move;
      for (let d = close2.depth + 1;d <= $to.depth; d++) {
        let node = $to.node(d), add = node.type.contentMatch.fillBefore(node.content, true, $to.index(d));
        this.openFrontierNode(node.type, node.attrs, add);
      }
      return $to;
    }
    openFrontierNode(type, attrs = null, content) {
      let top = this.frontier[this.depth];
      top.match = top.match.matchType(type);
      this.placed = addToFragment(this.placed, this.depth, Fragment.from(type.create(attrs, content)));
      this.frontier.push({ type, match: type.contentMatch });
    }
    closeFrontierNode() {
      let open = this.frontier.pop();
      let add = open.match.fillBefore(Fragment.empty, true);
      if (add.childCount)
        this.placed = addToFragment(this.placed, this.frontier.length, add);
    }
  }
  function dropFromFragment(fragment, depth, count) {
    if (depth == 0)
      return fragment.cutByIndex(count, fragment.childCount);
    return fragment.replaceChild(0, fragment.firstChild.copy(dropFromFragment(fragment.firstChild.content, depth - 1, count)));
  }
  function addToFragment(fragment, depth, content) {
    if (depth == 0)
      return fragment.append(content);
    return fragment.replaceChild(fragment.childCount - 1, fragment.lastChild.copy(addToFragment(fragment.lastChild.content, depth - 1, content)));
  }
  function contentAt(fragment, depth) {
    for (let i = 0;i < depth; i++)
      fragment = fragment.firstChild.content;
    return fragment;
  }
  function closeNodeStart(node, openStart, openEnd) {
    if (openStart <= 0)
      return node;
    let frag = node.content;
    if (openStart > 1)
      frag = frag.replaceChild(0, closeNodeStart(frag.firstChild, openStart - 1, frag.childCount == 1 ? openEnd - 1 : 0));
    if (openStart > 0) {
      frag = node.type.contentMatch.fillBefore(frag).append(frag);
      if (openEnd <= 0)
        frag = frag.append(node.type.contentMatch.matchFragment(frag).fillBefore(Fragment.empty, true));
    }
    return node.copy(frag);
  }
  function contentAfterFits($to, depth, type, match, open) {
    let node = $to.node(depth), index = open ? $to.indexAfter(depth) : $to.index(depth);
    if (index == node.childCount && !type.compatibleContent(node.type))
      return null;
    let fit = match.fillBefore(node.content, true, index);
    return fit && !invalidMarks(type, node.content, index) ? fit : null;
  }
  function invalidMarks(type, fragment, start) {
    for (let i = start;i < fragment.childCount; i++)
      if (!type.allowsMarks(fragment.child(i).marks))
        return true;
    return false;
  }
  function definesContent(type) {
    return type.spec.defining || type.spec.definingForContent;
  }
  function maxOpen(frag, side) {
    for (let count = 0;; count++) {
      let ch = side < 0 ? frag.firstChild : frag.lastChild;
      if (!ch || ch.isAtom)
        return count;
      frag = ch.content;
    }
  }
  function replaceRange(tr, from, to, slice) {
    if (!slice.size)
      return tr.deleteRange(from, to);
    let $from = tr.doc.resolve(from), $to = tr.doc.resolve(to);
    if (fitsTrivially($from, $to, slice))
      return tr.step(new ReplaceStep(from, to, slice));
    let targetDepths = coveredDepths($from, $to);
    if (targetDepths[targetDepths.length - 1] == 0)
      targetDepths.pop();
    let preferredTarget = -($from.depth + 1);
    targetDepths.unshift(preferredTarget);
    for (let d = $from.depth, pos = $from.pos - 1;d > 0; d--, pos--) {
      let spec = $from.node(d).type.spec;
      if (spec.defining || spec.definingAsContext || spec.isolating)
        break;
      if (targetDepths.indexOf(d) > -1)
        preferredTarget = d;
      else if ($from.before(d) == pos)
        targetDepths.splice(1, 0, -d);
    }
    let preferredTargetIndex = targetDepths.indexOf(preferredTarget);
    let leftNodes = [], preferredDepth = slice.openStart;
    for (let content = slice.content, i = 0;; i++) {
      let node = content.firstChild;
      leftNodes.push(node);
      if (i == slice.openStart)
        break;
      content = node.content;
    }
    for (let d = preferredDepth - 1;d >= 0; d--) {
      let leftNode = leftNodes[d], def = definesContent(leftNode.type);
      if (def && !leftNode.sameMarkup($from.node(Math.abs(preferredTarget) - 1)))
        preferredDepth = d;
      else if (def || !leftNode.type.isTextblock)
        break;
    }
    for (let j = slice.openStart;j >= 0; j--) {
      let openDepth = (j + preferredDepth + 1) % (slice.openStart + 1);
      let insert = leftNodes[openDepth];
      if (!insert)
        continue;
      for (let i = 0;i < targetDepths.length; i++) {
        let targetDepth = targetDepths[(i + preferredTargetIndex) % targetDepths.length], expand = true;
        if (targetDepth < 0) {
          expand = false;
          targetDepth = -targetDepth;
        }
        let parent = $from.node(targetDepth - 1), index = $from.index(targetDepth - 1);
        if (parent.canReplaceWith(index, index, insert.type, insert.marks))
          return tr.replace($from.before(targetDepth), expand ? $to.after(targetDepth) : to, new Slice(closeFragment(slice.content, 0, slice.openStart, openDepth), openDepth, slice.openEnd));
      }
    }
    let startSteps = tr.steps.length;
    for (let i = targetDepths.length - 1;i >= 0; i--) {
      tr.replace(from, to, slice);
      if (tr.steps.length > startSteps)
        break;
      let depth = targetDepths[i];
      if (depth < 0)
        continue;
      from = $from.before(depth);
      to = $to.after(depth);
    }
  }
  function closeFragment(fragment, depth, oldOpen, newOpen, parent) {
    if (depth < oldOpen) {
      let first = fragment.firstChild;
      fragment = fragment.replaceChild(0, first.copy(closeFragment(first.content, depth + 1, oldOpen, newOpen, first)));
    }
    if (depth > newOpen) {
      let match = parent.contentMatchAt(0);
      let start = match.fillBefore(fragment).append(fragment);
      fragment = start.append(match.matchFragment(start).fillBefore(Fragment.empty, true));
    }
    return fragment;
  }
  function replaceRangeWith(tr, from, to, node) {
    if (!node.isInline && from == to && tr.doc.resolve(from).parent.content.size) {
      let point = insertPoint(tr.doc, from, node.type);
      if (point != null)
        from = to = point;
    }
    tr.replaceRange(from, to, new Slice(Fragment.from(node), 0, 0));
  }
  function deleteRange(tr, from, to) {
    let $from = tr.doc.resolve(from), $to = tr.doc.resolve(to);
    if ($from.parent.isTextblock && $to.parent.isTextblock && $from.start() != $to.start() && $from.parentOffset == 0 && $to.parentOffset == 0) {
      let shared = $from.sharedDepth(to), isolated = false;
      for (let d = $from.depth;d > shared; d--)
        if ($from.node(d).type.spec.isolating)
          isolated = true;
      for (let d = $to.depth;d > shared; d--)
        if ($to.node(d).type.spec.isolating)
          isolated = true;
      if (!isolated) {
        for (let d = $from.depth;d > 0 && from == $from.start(d); d--)
          from = $from.before(d);
        for (let d = $to.depth;d > 0 && to == $to.start(d); d--)
          to = $to.before(d);
        $from = tr.doc.resolve(from);
        $to = tr.doc.resolve(to);
      }
    }
    let covered = coveredDepths($from, $to);
    for (let i = 0;i < covered.length; i++) {
      let depth = covered[i], last = i == covered.length - 1;
      if (last && depth == 0 || $from.node(depth).type.contentMatch.validEnd)
        return tr.delete($from.start(depth), $to.end(depth));
      if (depth > 0 && (last || $from.node(depth - 1).canReplace($from.index(depth - 1), $to.indexAfter(depth - 1))))
        return tr.delete($from.before(depth), $to.after(depth));
    }
    for (let d = 1;d <= $from.depth && d <= $to.depth; d++) {
      if (from - $from.start(d) == $from.depth - d && to > $from.end(d) && $to.end(d) - to != $to.depth - d && $from.start(d - 1) == $to.start(d - 1) && $from.node(d - 1).canReplace($from.index(d - 1), $to.index(d - 1)))
        return tr.delete($from.before(d), to);
    }
    tr.delete(from, to);
  }
  function coveredDepths($from, $to) {
    let result = [], minDepth = Math.min($from.depth, $to.depth);
    for (let d = minDepth;d >= 0; d--) {
      let start = $from.start(d);
      if (start < $from.pos - ($from.depth - d) || $to.end(d) > $to.pos + ($to.depth - d) || $from.node(d).type.spec.isolating || $to.node(d).type.spec.isolating)
        break;
      if (start == $to.start(d) || d == $from.depth && d == $to.depth && $from.parent.inlineContent && $to.parent.inlineContent && d && $to.start(d - 1) == start - 1)
        result.push(d);
    }
    return result;
  }

  class AttrStep extends Step {
    constructor(pos, attr, value) {
      super();
      this.pos = pos;
      this.attr = attr;
      this.value = value;
    }
    apply(doc) {
      let node = doc.nodeAt(this.pos);
      if (!node)
        return StepResult.fail("No node at attribute step's position");
      let attrs = Object.create(null);
      for (let name in node.attrs)
        attrs[name] = node.attrs[name];
      attrs[this.attr] = this.value;
      let updated = node.type.create(attrs, null, node.marks);
      return StepResult.fromReplace(doc, this.pos, this.pos + 1, new Slice(Fragment.from(updated), 0, node.isLeaf ? 0 : 1));
    }
    getMap() {
      return StepMap.empty;
    }
    invert(doc) {
      return new AttrStep(this.pos, this.attr, doc.nodeAt(this.pos).attrs[this.attr]);
    }
    map(mapping) {
      let pos = mapping.mapResult(this.pos, 1);
      return pos.deletedAfter ? null : new AttrStep(pos.pos, this.attr, this.value);
    }
    toJSON() {
      return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
    }
    static fromJSON(schema, json) {
      if (typeof json.pos != "number" || typeof json.attr != "string")
        throw new RangeError("Invalid input for AttrStep.fromJSON");
      return new AttrStep(json.pos, json.attr, json.value);
    }
  }
  Step.jsonID("attr", AttrStep);

  class DocAttrStep extends Step {
    constructor(attr, value) {
      super();
      this.attr = attr;
      this.value = value;
    }
    apply(doc) {
      let attrs = Object.create(null);
      for (let name in doc.attrs)
        attrs[name] = doc.attrs[name];
      attrs[this.attr] = this.value;
      let updated = doc.type.create(attrs, doc.content, doc.marks);
      return StepResult.ok(updated);
    }
    getMap() {
      return StepMap.empty;
    }
    invert(doc) {
      return new DocAttrStep(this.attr, doc.attrs[this.attr]);
    }
    map(mapping) {
      return this;
    }
    toJSON() {
      return { stepType: "docAttr", attr: this.attr, value: this.value };
    }
    static fromJSON(schema, json) {
      if (typeof json.attr != "string")
        throw new RangeError("Invalid input for DocAttrStep.fromJSON");
      return new DocAttrStep(json.attr, json.value);
    }
  }
  Step.jsonID("docAttr", DocAttrStep);
  var TransformError = class extends Error {
  };
  TransformError = function TransformError2(message) {
    let err = Error.call(this, message);
    err.__proto__ = TransformError2.prototype;
    return err;
  };
  TransformError.prototype = Object.create(Error.prototype);
  TransformError.prototype.constructor = TransformError;
  TransformError.prototype.name = "TransformError";

  class Transform {
    constructor(doc) {
      this.doc = doc;
      this.steps = [];
      this.docs = [];
      this.mapping = new Mapping;
    }
    get before() {
      return this.docs.length ? this.docs[0] : this.doc;
    }
    step(step) {
      let result = this.maybeStep(step);
      if (result.failed)
        throw new TransformError(result.failed);
      return this;
    }
    maybeStep(step) {
      let result = step.apply(this.doc);
      if (!result.failed)
        this.addStep(step, result.doc);
      return result;
    }
    get docChanged() {
      return this.steps.length > 0;
    }
    changedRange() {
      let from = 1e9, to = -1e9;
      for (let i = 0;i < this.mapping.maps.length; i++) {
        let map = this.mapping.maps[i];
        if (i) {
          from = map.map(from, 1);
          to = map.map(to, -1);
        }
        map.forEach((_f, _t, fromB, toB) => {
          from = Math.min(from, fromB);
          to = Math.max(to, toB);
        });
      }
      return from == 1e9 ? null : { from, to };
    }
    addStep(step, doc) {
      this.docs.push(this.doc);
      this.steps.push(step);
      this.mapping.appendMap(step.getMap());
      this.doc = doc;
    }
    replace(from, to = from, slice = Slice.empty) {
      let step = replaceStep(this.doc, from, to, slice);
      if (step)
        this.step(step);
      return this;
    }
    replaceWith(from, to, content) {
      return this.replace(from, to, new Slice(Fragment.from(content), 0, 0));
    }
    delete(from, to) {
      return this.replace(from, to, Slice.empty);
    }
    insert(pos, content) {
      return this.replaceWith(pos, pos, content);
    }
    replaceRange(from, to, slice) {
      replaceRange(this, from, to, slice);
      return this;
    }
    replaceRangeWith(from, to, node) {
      replaceRangeWith(this, from, to, node);
      return this;
    }
    deleteRange(from, to) {
      deleteRange(this, from, to);
      return this;
    }
    lift(range, target) {
      lift(this, range, target);
      return this;
    }
    join(pos, depth = 1) {
      join(this, pos, depth);
      return this;
    }
    wrap(range, wrappers) {
      wrap(this, range, wrappers);
      return this;
    }
    setBlockType(from, to = from, type, attrs = null) {
      setBlockType(this, from, to, type, attrs);
      return this;
    }
    setNodeMarkup(pos, type, attrs = null, marks) {
      setNodeMarkup(this, pos, type, attrs, marks);
      return this;
    }
    setNodeAttribute(pos, attr, value) {
      this.step(new AttrStep(pos, attr, value));
      return this;
    }
    setDocAttribute(attr, value) {
      this.step(new DocAttrStep(attr, value));
      return this;
    }
    addNodeMark(pos, mark) {
      this.step(new AddNodeMarkStep(pos, mark));
      return this;
    }
    removeNodeMark(pos, mark) {
      let node = this.doc.nodeAt(pos);
      if (!node)
        throw new RangeError("No node at position " + pos);
      if (mark instanceof Mark) {
        if (mark.isInSet(node.marks))
          this.step(new RemoveNodeMarkStep(pos, mark));
      } else {
        let set = node.marks, found2, steps = [];
        while (found2 = mark.isInSet(set)) {
          steps.push(new RemoveNodeMarkStep(pos, found2));
          set = found2.removeFromSet(set);
        }
        for (let i = steps.length - 1;i >= 0; i--)
          this.step(steps[i]);
      }
      return this;
    }
    split(pos, depth = 1, typesAfter) {
      split(this, pos, depth, typesAfter);
      return this;
    }
    addMark(from, to, mark) {
      addMark(this, from, to, mark);
      return this;
    }
    removeMark(from, to, mark) {
      removeMark(this, from, to, mark);
      return this;
    }
    clearIncompatible(pos, parentType, match) {
      clearIncompatible(this, pos, parentType, match);
      return this;
    }
  }

  // apps/ios/EditorModel/node_modules/prosemirror-state/dist/index.js
  var classesById = Object.create(null);

  class Selection {
    constructor($anchor, $head, ranges) {
      this.$anchor = $anchor;
      this.$head = $head;
      this.ranges = ranges || [new SelectionRange($anchor.min($head), $anchor.max($head))];
    }
    get anchor() {
      return this.$anchor.pos;
    }
    get head() {
      return this.$head.pos;
    }
    get from() {
      return this.$from.pos;
    }
    get to() {
      return this.$to.pos;
    }
    get $from() {
      return this.ranges[0].$from;
    }
    get $to() {
      return this.ranges[0].$to;
    }
    get empty() {
      let ranges = this.ranges;
      for (let i = 0;i < ranges.length; i++)
        if (ranges[i].$from.pos != ranges[i].$to.pos)
          return false;
      return true;
    }
    content() {
      return this.$from.doc.slice(this.from, this.to, true);
    }
    replace(tr, content = Slice.empty) {
      let lastNode = content.content.lastChild, lastParent = null;
      for (let i = 0;i < content.openEnd; i++) {
        lastParent = lastNode;
        lastNode = lastNode.lastChild;
      }
      let mapFrom = tr.steps.length, ranges = this.ranges;
      for (let i = 0;i < ranges.length; i++) {
        let { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
        tr.replaceRange(mapping.map($from.pos), mapping.map($to.pos), i ? Slice.empty : content);
        if (i == 0)
          selectionToInsertionEnd(tr, mapFrom, (lastNode ? lastNode.isInline : lastParent && lastParent.isTextblock) ? -1 : 1);
      }
    }
    replaceWith(tr, node) {
      let mapFrom = tr.steps.length, ranges = this.ranges;
      for (let i = 0;i < ranges.length; i++) {
        let { $from, $to } = ranges[i], mapping = tr.mapping.slice(mapFrom);
        let from = mapping.map($from.pos), to = mapping.map($to.pos);
        if (i) {
          tr.deleteRange(from, to);
        } else {
          tr.replaceRangeWith(from, to, node);
          selectionToInsertionEnd(tr, mapFrom, node.isInline ? -1 : 1);
        }
      }
    }
    static findFrom($pos, dir, textOnly = false) {
      let inner = $pos.parent.inlineContent ? new TextSelection($pos) : findSelectionIn($pos.node(0), $pos.parent, $pos.pos, $pos.index(), dir, textOnly);
      if (inner)
        return inner;
      for (let depth = $pos.depth - 1;depth >= 0; depth--) {
        let found2 = dir < 0 ? findSelectionIn($pos.node(0), $pos.node(depth), $pos.before(depth + 1), $pos.index(depth), dir, textOnly) : findSelectionIn($pos.node(0), $pos.node(depth), $pos.after(depth + 1), $pos.index(depth) + 1, dir, textOnly);
        if (found2)
          return found2;
      }
      return null;
    }
    static near($pos, bias = 1) {
      return this.findFrom($pos, bias) || this.findFrom($pos, -bias) || new AllSelection($pos.node(0));
    }
    static atStart(doc) {
      return findSelectionIn(doc, doc, 0, 0, 1) || new AllSelection(doc);
    }
    static atEnd(doc) {
      return findSelectionIn(doc, doc, doc.content.size, doc.childCount, -1) || new AllSelection(doc);
    }
    static fromJSON(doc, json) {
      if (!json || !json.type)
        throw new RangeError("Invalid input for Selection.fromJSON");
      let cls = classesById[json.type];
      if (!cls)
        throw new RangeError(`No selection type ${json.type} defined`);
      return cls.fromJSON(doc, json);
    }
    static jsonID(id, selectionClass) {
      if (id in classesById)
        throw new RangeError("Duplicate use of selection JSON ID " + id);
      classesById[id] = selectionClass;
      selectionClass.prototype.jsonID = id;
      return selectionClass;
    }
    getBookmark() {
      return TextSelection.between(this.$anchor, this.$head).getBookmark();
    }
  }
  Selection.prototype.visible = true;

  class SelectionRange {
    constructor($from, $to) {
      this.$from = $from;
      this.$to = $to;
    }
  }
  var warnedAboutTextSelection = false;
  function checkTextSelection($pos) {
    if (!warnedAboutTextSelection && !$pos.parent.inlineContent) {
      warnedAboutTextSelection = true;
      console["warn"]("TextSelection endpoint not pointing into a node with inline content (" + $pos.parent.type.name + ")");
    }
  }

  class TextSelection extends Selection {
    constructor($anchor, $head = $anchor) {
      checkTextSelection($anchor);
      checkTextSelection($head);
      super($anchor, $head);
    }
    get $cursor() {
      return this.$anchor.pos == this.$head.pos ? this.$head : null;
    }
    map(doc, mapping) {
      let $head = doc.resolve(mapping.map(this.head));
      if (!$head.parent.inlineContent)
        return Selection.near($head);
      let $anchor = doc.resolve(mapping.map(this.anchor));
      return new TextSelection($anchor.parent.inlineContent ? $anchor : $head, $head);
    }
    replace(tr, content = Slice.empty) {
      super.replace(tr, content);
      if (content == Slice.empty) {
        let marks = this.$from.marksAcross(this.$to);
        if (marks)
          tr.ensureMarks(marks);
      }
    }
    eq(other) {
      return other instanceof TextSelection && other.anchor == this.anchor && other.head == this.head;
    }
    getBookmark() {
      return new TextBookmark(this.anchor, this.head);
    }
    toJSON() {
      return { type: "text", anchor: this.anchor, head: this.head };
    }
    static fromJSON(doc, json) {
      if (typeof json.anchor != "number" || typeof json.head != "number")
        throw new RangeError("Invalid input for TextSelection.fromJSON");
      return new TextSelection(doc.resolve(json.anchor), doc.resolve(json.head));
    }
    static create(doc, anchor, head = anchor) {
      let $anchor = doc.resolve(anchor);
      return new this($anchor, head == anchor ? $anchor : doc.resolve(head));
    }
    static between($anchor, $head, bias) {
      let dPos = $anchor.pos - $head.pos;
      if (!bias || dPos)
        bias = dPos >= 0 ? 1 : -1;
      if (!$head.parent.inlineContent) {
        let found2 = Selection.findFrom($head, bias, true) || Selection.findFrom($head, -bias, true);
        if (found2)
          $head = found2.$head;
        else
          return Selection.near($head, bias);
      }
      if (!$anchor.parent.inlineContent) {
        if (dPos == 0) {
          $anchor = $head;
        } else {
          $anchor = (Selection.findFrom($anchor, -bias, true) || Selection.findFrom($anchor, bias, true)).$anchor;
          if ($anchor.pos < $head.pos != dPos < 0)
            $anchor = $head;
        }
      }
      return new TextSelection($anchor, $head);
    }
  }
  Selection.jsonID("text", TextSelection);

  class TextBookmark {
    constructor(anchor, head) {
      this.anchor = anchor;
      this.head = head;
    }
    map(mapping) {
      return new TextBookmark(mapping.map(this.anchor), mapping.map(this.head));
    }
    resolve(doc) {
      return TextSelection.between(doc.resolve(this.anchor), doc.resolve(this.head));
    }
  }

  class NodeSelection extends Selection {
    constructor($pos) {
      let node = $pos.nodeAfter;
      let $end = $pos.node(0).resolve($pos.pos + node.nodeSize);
      super($pos, $end);
      this.node = node;
    }
    map(doc, mapping) {
      let { deleted, pos } = mapping.mapResult(this.anchor);
      let $pos = doc.resolve(pos);
      if (deleted)
        return Selection.near($pos);
      return new NodeSelection($pos);
    }
    content() {
      return new Slice(Fragment.from(this.node), 0, 0);
    }
    eq(other) {
      return other instanceof NodeSelection && other.anchor == this.anchor;
    }
    toJSON() {
      return { type: "node", anchor: this.anchor };
    }
    getBookmark() {
      return new NodeBookmark(this.anchor);
    }
    static fromJSON(doc, json) {
      if (typeof json.anchor != "number")
        throw new RangeError("Invalid input for NodeSelection.fromJSON");
      return new NodeSelection(doc.resolve(json.anchor));
    }
    static create(doc, from) {
      return new NodeSelection(doc.resolve(from));
    }
    static isSelectable(node) {
      return !node.isText && node.type.spec.selectable !== false;
    }
  }
  NodeSelection.prototype.visible = false;
  Selection.jsonID("node", NodeSelection);

  class NodeBookmark {
    constructor(anchor) {
      this.anchor = anchor;
    }
    map(mapping) {
      let { deleted, pos } = mapping.mapResult(this.anchor);
      return deleted ? new TextBookmark(pos, pos) : new NodeBookmark(pos);
    }
    resolve(doc) {
      let $pos = doc.resolve(this.anchor), node = $pos.nodeAfter;
      if (node && NodeSelection.isSelectable(node))
        return new NodeSelection($pos);
      return Selection.near($pos);
    }
  }

  class AllSelection extends Selection {
    constructor(doc) {
      super(doc.resolve(0), doc.resolve(doc.content.size));
    }
    replace(tr, content = Slice.empty) {
      if (content == Slice.empty) {
        tr.delete(0, tr.doc.content.size);
        let sel = Selection.atStart(tr.doc);
        if (!sel.eq(tr.selection))
          tr.setSelection(sel);
      } else {
        super.replace(tr, content);
      }
    }
    toJSON() {
      return { type: "all" };
    }
    static fromJSON(doc) {
      return new AllSelection(doc);
    }
    map(doc) {
      return new AllSelection(doc);
    }
    eq(other) {
      return other instanceof AllSelection;
    }
    getBookmark() {
      return AllBookmark;
    }
  }
  Selection.jsonID("all", AllSelection);
  var AllBookmark = {
    map() {
      return this;
    },
    resolve(doc) {
      return new AllSelection(doc);
    }
  };
  function findSelectionIn(doc, node, pos, index, dir, text = false) {
    if (node.inlineContent)
      return TextSelection.create(doc, pos);
    for (let i = index - (dir > 0 ? 0 : 1);dir > 0 ? i < node.childCount : i >= 0; i += dir) {
      let child = node.child(i);
      if (!child.isAtom) {
        let inner = findSelectionIn(doc, child, pos + dir, dir < 0 ? child.childCount : 0, dir, text);
        if (inner)
          return inner;
      } else if (!text && NodeSelection.isSelectable(child)) {
        return NodeSelection.create(doc, pos - (dir < 0 ? child.nodeSize : 0));
      }
      pos += child.nodeSize * dir;
    }
    return null;
  }
  function selectionToInsertionEnd(tr, startLen, bias) {
    let last = tr.steps.length - 1;
    if (last < startLen)
      return;
    let step = tr.steps[last];
    if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep))
      return;
    let map = tr.mapping.maps[last], end;
    map.forEach((_from, _to, _newFrom, newTo) => {
      if (end == null)
        end = newTo;
    });
    tr.setSelection(Selection.near(tr.doc.resolve(end), bias));
  }
  var UPDATED_SEL = 1;
  var UPDATED_MARKS = 2;
  var UPDATED_SCROLL = 4;

  class Transaction extends Transform {
    constructor(state) {
      super(state.doc);
      this.curSelectionFor = 0;
      this.updated = 0;
      this.meta = Object.create(null);
      this.time = Date.now();
      this.curSelection = state.selection;
      this.storedMarks = state.storedMarks;
    }
    get selection() {
      if (this.curSelectionFor < this.steps.length) {
        this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor));
        this.curSelectionFor = this.steps.length;
      }
      return this.curSelection;
    }
    setSelection(selection) {
      if (selection.$from.doc != this.doc)
        throw new RangeError("Selection passed to setSelection must point at the current document");
      this.curSelection = selection;
      this.curSelectionFor = this.steps.length;
      this.updated = (this.updated | UPDATED_SEL) & ~UPDATED_MARKS;
      this.storedMarks = null;
      return this;
    }
    get selectionSet() {
      return (this.updated & UPDATED_SEL) > 0;
    }
    setStoredMarks(marks) {
      this.storedMarks = marks;
      this.updated |= UPDATED_MARKS;
      return this;
    }
    ensureMarks(marks) {
      if (!Mark.sameSet(this.storedMarks || this.selection.$from.marks(), marks))
        this.setStoredMarks(marks);
      return this;
    }
    addStoredMark(mark) {
      return this.ensureMarks(mark.addToSet(this.storedMarks || this.selection.$head.marks()));
    }
    removeStoredMark(mark) {
      return this.ensureMarks(mark.removeFromSet(this.storedMarks || this.selection.$head.marks()));
    }
    get storedMarksSet() {
      return (this.updated & UPDATED_MARKS) > 0;
    }
    addStep(step, doc) {
      super.addStep(step, doc);
      this.updated = this.updated & ~UPDATED_MARKS;
      this.storedMarks = null;
    }
    setTime(time) {
      this.time = time;
      return this;
    }
    replaceSelection(slice) {
      this.selection.replace(this, slice);
      return this;
    }
    replaceSelectionWith(node, inheritMarks = true) {
      let selection = this.selection;
      if (inheritMarks)
        node = node.mark(this.storedMarks || (selection.empty ? selection.$from.marks() : selection.$from.marksAcross(selection.$to) || Mark.none));
      selection.replaceWith(this, node);
      return this;
    }
    deleteSelection() {
      this.selection.replace(this);
      return this;
    }
    insertText(text, from, to) {
      let schema = this.doc.type.schema;
      if (from == null) {
        if (!text)
          return this.deleteSelection();
        return this.replaceSelectionWith(schema.text(text), true);
      } else {
        if (to == null)
          to = from;
        if (!text)
          return this.deleteRange(from, to);
        let marks = this.storedMarks;
        if (!marks) {
          let $from = this.doc.resolve(from);
          marks = to == from ? $from.marks() : $from.marksAcross(this.doc.resolve(to));
        }
        this.replaceRangeWith(from, to, schema.text(text, marks));
        if (!this.selection.empty && this.selection.to == from + text.length)
          this.setSelection(Selection.near(this.selection.$to));
        return this;
      }
    }
    setMeta(key, value) {
      this.meta[typeof key == "string" ? key : key.key] = value;
      return this;
    }
    getMeta(key) {
      return this.meta[typeof key == "string" ? key : key.key];
    }
    get isGeneric() {
      for (let _ in this.meta)
        return false;
      return true;
    }
    scrollIntoView() {
      this.updated |= UPDATED_SCROLL;
      return this;
    }
    get scrolledIntoView() {
      return (this.updated & UPDATED_SCROLL) > 0;
    }
  }
  function bind(f, self) {
    return !self || !f ? f : f.bind(self);
  }

  class FieldDesc {
    constructor(name, desc, self) {
      this.name = name;
      this.init = bind(desc.init, self);
      this.apply = bind(desc.apply, self);
    }
  }
  var baseFields = [
    new FieldDesc("doc", {
      init(config) {
        return config.doc || config.schema.topNodeType.createAndFill();
      },
      apply(tr) {
        return tr.doc;
      }
    }),
    new FieldDesc("selection", {
      init(config, instance) {
        return config.selection || Selection.atStart(instance.doc);
      },
      apply(tr) {
        return tr.selection;
      }
    }),
    new FieldDesc("storedMarks", {
      init(config) {
        return config.storedMarks || null;
      },
      apply(tr, _marks, _old, state) {
        return state.selection.$cursor ? tr.storedMarks : null;
      }
    }),
    new FieldDesc("scrollToSelection", {
      init() {
        return 0;
      },
      apply(tr, prev) {
        return tr.scrolledIntoView ? prev + 1 : prev;
      }
    })
  ];

  class Configuration {
    constructor(schema, plugins) {
      this.schema = schema;
      this.plugins = [];
      this.pluginsByKey = Object.create(null);
      this.fields = baseFields.slice();
      if (plugins)
        plugins.forEach((plugin) => {
          if (this.pluginsByKey[plugin.key])
            throw new RangeError("Adding different instances of a keyed plugin (" + plugin.key + ")");
          this.plugins.push(plugin);
          this.pluginsByKey[plugin.key] = plugin;
          if (plugin.spec.state)
            this.fields.push(new FieldDesc(plugin.key, plugin.spec.state, plugin));
        });
    }
  }

  class EditorState {
    constructor(config) {
      this.config = config;
    }
    get schema() {
      return this.config.schema;
    }
    get plugins() {
      return this.config.plugins;
    }
    apply(tr) {
      return this.applyTransaction(tr).state;
    }
    filterTransaction(tr, ignore = -1) {
      for (let i = 0;i < this.config.plugins.length; i++)
        if (i != ignore) {
          let plugin = this.config.plugins[i];
          if (plugin.spec.filterTransaction && !plugin.spec.filterTransaction.call(plugin, tr, this))
            return false;
        }
      return true;
    }
    applyTransaction(rootTr) {
      if (!this.filterTransaction(rootTr))
        return { state: this, transactions: [] };
      let trs = [rootTr], newState = this.applyInner(rootTr), seen = null;
      for (;; ) {
        let haveNew = false;
        for (let i = 0;i < this.config.plugins.length; i++) {
          let plugin = this.config.plugins[i];
          if (plugin.spec.appendTransaction) {
            let n = seen ? seen[i].n : 0, oldState = seen ? seen[i].state : this;
            let tr = n < trs.length && plugin.spec.appendTransaction.call(plugin, n ? trs.slice(n) : trs, oldState, newState);
            if (tr && newState.filterTransaction(tr, i)) {
              tr.setMeta("appendedTransaction", rootTr);
              if (!seen) {
                seen = [];
                for (let j = 0;j < this.config.plugins.length; j++)
                  seen.push(j < i ? { state: newState, n: trs.length } : { state: this, n: 0 });
              }
              trs.push(tr);
              newState = newState.applyInner(tr);
              haveNew = true;
            }
            if (seen)
              seen[i] = { state: newState, n: trs.length };
          }
        }
        if (!haveNew)
          return { state: newState, transactions: trs };
      }
    }
    applyInner(tr) {
      if (!tr.before.eq(this.doc))
        throw new RangeError("Applying a mismatched transaction");
      let newInstance = new EditorState(this.config), fields = this.config.fields;
      for (let i = 0;i < fields.length; i++) {
        let field = fields[i];
        newInstance[field.name] = field.apply(tr, this[field.name], this, newInstance);
      }
      return newInstance;
    }
    get tr() {
      return new Transaction(this);
    }
    static create(config) {
      let $config = new Configuration(config.doc ? config.doc.type.schema : config.schema, config.plugins);
      let instance = new EditorState($config);
      for (let i = 0;i < $config.fields.length; i++)
        instance[$config.fields[i].name] = $config.fields[i].init(config, instance);
      return instance;
    }
    reconfigure(config) {
      let $config = new Configuration(this.schema, config.plugins);
      let fields = $config.fields, instance = new EditorState($config);
      for (let i = 0;i < fields.length; i++) {
        let name = fields[i].name;
        instance[name] = this.hasOwnProperty(name) ? this[name] : fields[i].init(config, instance);
      }
      return instance;
    }
    toJSON(pluginFields) {
      let result = { doc: this.doc.toJSON(), selection: this.selection.toJSON() };
      if (this.storedMarks)
        result.storedMarks = this.storedMarks.map((m) => m.toJSON());
      if (pluginFields && typeof pluginFields == "object")
        for (let prop in pluginFields) {
          if (prop == "doc" || prop == "selection")
            throw new RangeError("The JSON fields `doc` and `selection` are reserved");
          let plugin = pluginFields[prop], state = plugin.spec.state;
          if (state && state.toJSON)
            result[prop] = state.toJSON.call(plugin, this[plugin.key]);
        }
      return result;
    }
    static fromJSON(config, json, pluginFields) {
      if (!json)
        throw new RangeError("Invalid input for EditorState.fromJSON");
      if (!config.schema)
        throw new RangeError("Required config field 'schema' missing");
      let $config = new Configuration(config.schema, config.plugins);
      let instance = new EditorState($config);
      $config.fields.forEach((field) => {
        if (field.name == "doc") {
          instance.doc = Node.fromJSON(config.schema, json.doc);
        } else if (field.name == "selection") {
          instance.selection = Selection.fromJSON(instance.doc, json.selection);
        } else if (field.name == "storedMarks") {
          if (json.storedMarks)
            instance.storedMarks = json.storedMarks.map(config.schema.markFromJSON);
        } else {
          if (pluginFields)
            for (let prop in pluginFields) {
              let plugin = pluginFields[prop], state = plugin.spec.state;
              if (plugin.key == field.name && state && state.fromJSON && Object.prototype.hasOwnProperty.call(json, prop)) {
                instance[field.name] = state.fromJSON.call(plugin, config, json[prop], instance);
                return;
              }
            }
          instance[field.name] = field.init(config, instance);
        }
      });
      return instance;
    }
  }
  var keys = Object.create(null);

  // apps/ios/EditorModel/node_modules/prosemirror-schema-basic/dist/index.js
  var pDOM = ["p", 0];
  var blockquoteDOM = ["blockquote", 0];
  var hrDOM = ["hr"];
  var preDOM = ["pre", ["code", 0]];
  var brDOM = ["br"];
  var nodes = {
    doc: {
      content: "block+"
    },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM() {
        return pDOM;
      }
    },
    blockquote: {
      content: "block+",
      group: "block",
      defining: true,
      parseDOM: [{ tag: "blockquote" }],
      toDOM() {
        return blockquoteDOM;
      }
    },
    horizontal_rule: {
      group: "block",
      parseDOM: [{ tag: "hr" }],
      toDOM() {
        return hrDOM;
      }
    },
    heading: {
      attrs: { level: { default: 1, validate: "number" } },
      content: "inline*",
      group: "block",
      defining: true,
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
        { tag: "h4", attrs: { level: 4 } },
        { tag: "h5", attrs: { level: 5 } },
        { tag: "h6", attrs: { level: 6 } }
      ],
      toDOM(node) {
        return ["h" + +node.attrs.level, 0];
      }
    },
    code_block: {
      content: "text*",
      marks: "",
      group: "block",
      code: true,
      defining: true,
      parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
      toDOM() {
        return preDOM;
      }
    },
    text: {
      group: "inline"
    },
    image: {
      inline: true,
      attrs: {
        src: { validate: "string" },
        alt: { default: null, validate: "string|null" },
        title: { default: null, validate: "string|null" }
      },
      group: "inline",
      draggable: true,
      parseDOM: [{ tag: "img[src]", getAttrs(dom) {
        return {
          src: dom.getAttribute("src"),
          title: dom.getAttribute("title"),
          alt: dom.getAttribute("alt")
        };
      } }],
      toDOM(node) {
        let { src, alt, title } = node.attrs;
        return ["img", { src, alt, title }];
      }
    },
    hard_break: {
      inline: true,
      group: "inline",
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM() {
        return brDOM;
      }
    }
  };
  var emDOM = ["em", 0];
  var strongDOM = ["strong", 0];
  var codeDOM = ["code", 0];
  var marks = {
    link: {
      attrs: {
        href: { validate: "string" },
        title: { default: null, validate: "string|null" }
      },
      inclusive: false,
      parseDOM: [{ tag: "a[href]", getAttrs(dom) {
        return { href: dom.getAttribute("href"), title: dom.getAttribute("title") };
      } }],
      toDOM(node) {
        let { href, title } = node.attrs;
        return ["a", { href, title }, 0];
      }
    },
    em: {
      parseDOM: [
        { tag: "i" },
        { tag: "em" },
        { style: "font-style=italic" },
        { style: "font-style=normal", clearMark: (m) => m.type.name == "em" }
      ],
      toDOM() {
        return emDOM;
      }
    },
    strong: {
      parseDOM: [
        { tag: "strong" },
        { tag: "b", getAttrs: (node) => node.style.fontWeight != "normal" && null },
        { style: "font-weight=400", clearMark: (m) => m.type.name == "strong" },
        { style: "font-weight", getAttrs: (value) => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null }
      ],
      toDOM() {
        return strongDOM;
      }
    },
    code: {
      code: true,
      parseDOM: [{ tag: "code" }],
      toDOM() {
        return codeDOM;
      }
    }
  };
  var schema = new Schema({ nodes, marks });

  // apps/ios/EditorModel/node_modules/prosemirror-schema-list/dist/index.js
  var olDOM = ["ol", 0];
  var ulDOM = ["ul", 0];
  var liDOM = ["li", 0];
  var orderedList = {
    attrs: { order: { default: 1, validate: "number" } },
    parseDOM: [{ tag: "ol", getAttrs(dom) {
      return { order: dom.hasAttribute("start") ? +dom.getAttribute("start") : 1 };
    } }],
    toDOM(node) {
      return node.attrs.order == 1 ? olDOM : ["ol", { start: node.attrs.order }, 0];
    }
  };
  var bulletList = {
    parseDOM: [{ tag: "ul" }],
    toDOM() {
      return ulDOM;
    }
  };
  var listItem = {
    parseDOM: [{ tag: "li" }],
    toDOM() {
      return liDOM;
    },
    defining: true
  };
  function add(obj, props) {
    let copy = {};
    for (let prop in obj)
      copy[prop] = obj[prop];
    for (let prop in props)
      copy[prop] = props[prop];
    return copy;
  }
  function addListNodes(nodes2, itemContent, listGroup) {
    return nodes2.append({
      ordered_list: add(orderedList, { content: "list_item+", group: listGroup }),
      bullet_list: add(bulletList, { content: "list_item+", group: listGroup }),
      list_item: add(listItem, { content: itemContent })
    });
  }

  // apps/ios/EditorModel/node_modules/prosemirror-test-builder/dist/index.js
  var noTag = Node.prototype.tag = Object.create(null);
  function flatten(schema2, children, f) {
    let result = [], pos = 0, tag = noTag;
    for (let i = 0;i < children.length; i++) {
      let child = children[i];
      if (typeof child == "string") {
        let re = /<(\w+)>/g, m, at = 0, out = "";
        while (m = re.exec(child)) {
          out += child.slice(at, m.index);
          pos += m.index - at;
          at = m.index + m[0].length;
          if (tag == noTag)
            tag = Object.create(null);
          tag[m[1]] = pos;
        }
        out += child.slice(at);
        pos += child.length - at;
        if (out)
          result.push(f(schema2.text(out)));
      } else {
        if (child.tag && child.tag != Node.prototype.tag) {
          if (tag == noTag)
            tag = Object.create(null);
          for (let id in child.tag)
            tag[id] = child.tag[id] + (child.flat || child.isText ? 0 : 1) + pos;
        }
        if (child.flat) {
          for (let j = 0;j < child.flat.length; j++) {
            let node = f(child.flat[j]);
            pos += node.nodeSize;
            result.push(node);
          }
        } else {
          let node = f(child);
          pos += node.nodeSize;
          result.push(node);
        }
      }
    }
    return { nodes: result, tag };
  }
  function id(x) {
    return x;
  }
  function takeAttrs(attrs, args) {
    let a0 = args[0];
    if (!args.length || a0 && (typeof a0 == "string" || a0 instanceof Node || a0.flat))
      return attrs;
    args.shift();
    if (!attrs)
      return a0;
    if (!a0)
      return attrs;
    let result = {};
    for (let prop in attrs)
      result[prop] = attrs[prop];
    for (let prop in a0)
      result[prop] = a0[prop];
    return result;
  }
  function block(type, attrs = null) {
    let result = function(...args) {
      let myAttrs = takeAttrs(attrs, args);
      let { nodes: nodes2, tag } = flatten(type.schema, args, id);
      let node = type.create(myAttrs, nodes2);
      if (tag != noTag)
        node.tag = tag;
      return node;
    };
    if (type.isLeaf)
      try {
        result.flat = [type.create(attrs)];
      } catch (_) {}
    return result;
  }
  function mark(type, attrs) {
    return function(...args) {
      let mark2 = type.create(takeAttrs(attrs, args));
      let { nodes: nodes2, tag } = flatten(type.schema, args, (n) => {
        let newMarks = mark2.addToSet(n.marks);
        return newMarks.length > n.marks.length ? n.mark(newMarks) : n;
      });
      return { flat: nodes2, tag };
    };
  }
  function builders(schema2, names) {
    let result = { schema: schema2 };
    for (let name in schema2.nodes)
      result[name] = block(schema2.nodes[name], {});
    for (let name in schema2.marks)
      result[name] = mark(schema2.marks[name], {});
    if (names)
      for (let name in names) {
        let value = names[name], typeName = value.nodeType || value.markType || name, type;
        if (type = schema2.nodes[typeName])
          result[name] = block(type, value);
        else if (type = schema2.marks[typeName])
          result[name] = mark(type, value);
      }
    return result;
  }
  var schema2 = new Schema({
    nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
    marks: schema.spec.marks
  });
  var b = builders(schema2, {
    p: { nodeType: "paragraph" },
    pre: { nodeType: "code_block" },
    h1: { nodeType: "heading", level: 1 },
    h2: { nodeType: "heading", level: 2 },
    h3: { nodeType: "heading", level: 3 },
    li: { nodeType: "list_item" },
    ul: { nodeType: "bullet_list" },
    ol: { nodeType: "ordered_list" },
    br: { nodeType: "hard_break" },
    img: { nodeType: "image", src: "img.png" },
    hr: { nodeType: "horizontal_rule" },
    a: { markType: "link", href: "foo" }
  });
  function eq(a, b2) {
    return a.eq(b2);
  }
  var doc = b.doc;
  var p = b.p;
  var code_block = b.code_block;
  var pre = b.pre;
  var h1 = b.h1;
  var h2 = b.h2;
  var h3 = b.h3;
  var li = b.li;
  var ul = b.ul;
  var ol = b.ol;
  var img = b.img;
  var hr = b.hr;
  var br = b.br;
  var blockquote = b.blockquote;
  var a = b.a;
  var em = b.em;
  var strong = b.strong;
  var code = b.code;

  // apps/ios/EditorModel/node_modules/ist/ist.js
  var opNames = [
    "==",
    function(a2, b2) {
      return a2 == b2;
    },
    "!=",
    function(a2, b2) {
      return a2 != b2;
    },
    "===",
    function(a2, b2) {
      return a2 === b2;
    },
    "!==",
    function(a2, b2) {
      return a2 !== b2;
    },
    "<",
    function(a2, b2) {
      return a2 < b2;
    },
    ">=",
    function(a2, b2) {
      return a2 >= b2;
    },
    ">",
    function(a2, b2) {
      return a2 > b2;
    },
    "<=",
    function(a2, b2) {
      return a2 <= b2;
    }
  ];
  var ops = {};
  for (i = 0;i < opNames.length; i += 2)
    ops[opNames[i]] = opNames[i + 1];
  var i;
  function message(a2, b2, compare) {
    if (!compare || typeof compare == "string") {
      var index = opNames.indexOf(compare || "==");
      return a2 + " " + opNames[index + (index % 4 ? -2 : 2)] + " " + b2;
    }
    return "!" + compare.name + "(" + a2 + ", " + b2 + ")";
  }
  function ist(a2, b2, compare) {
    if (arguments.length == 1) {
      if (!a2)
        throw new ist.Failure("!" + a2, "ist");
    } else {
      var cmpFn = compare;
      if (typeof compare == "string") {
        if (!(cmpFn = ops[compare]))
          throw new RangeError("Unknow operator " + compare);
      } else if (!compare) {
        cmpFn = ops["=="];
      }
      if (!cmpFn(a2, b2)) {
        var cmpName = (typeof compare == "string" ? compare : compare && compare.name) || "==";
        throw new ist.Failure(message(a2, b2, compare), "ist");
      }
    }
  }
  ist.Failure = function(message2, src) {
    this.message = message2;
    if (Error.captureStackTrace)
      Error.captureStackTrace(this);
    else
      this.stack = new Error(message2).stack;
    if (this.stack) {
      var lines = this.stack.split(`
`), re = new RegExp("\\b" + src + "\\b");
      for (var i2 = 0;i2 < lines.length - 1; i2++) {
        if (re.test(lines[i2]) && !/\bFailure\b/.test(lines[i2])) {
          this.message += " " + lines[i2 + 1].trim();
          break;
        }
      }
    }
  };
  ist.Failure.prototype = Object.create(Error.prototype);
  ist.throws = function throws(f, expected) {
    let threw = true;
    try {
      f();
      threw = false;
    } catch (e) {
      var matches = !expected ? true : expected.test ? expected.test(e.message) : typeof expected == "string" ? e.message == expected : expected(e);
      if (!matches)
        throw e;
    }
    if (!threw)
      throw new ist.Failure("Did not throw", "throws");
  };
  ist.default = ist;
  var ist_default = ist;

  // apps/ios/EditorModel/node_modules/prosemirror-commands/dist/index.js
  var deleteSelection = (state, dispatch) => {
    if (state.selection.empty)
      return false;
    if (dispatch)
      dispatch(state.tr.deleteSelection().scrollIntoView());
    return true;
  };
  function atBlockStart(state, view) {
    let { $cursor } = state.selection;
    if (!$cursor || (view ? !view.endOfTextblock("backward", state) : $cursor.parentOffset > 0))
      return null;
    return $cursor;
  }
  var joinBackward = (state, dispatch, view) => {
    let $cursor = atBlockStart(state, view);
    if (!$cursor)
      return false;
    let $cut = findCutBefore($cursor);
    if (!$cut) {
      let range = $cursor.blockRange(), target = range && liftTarget(range);
      if (target == null)
        return false;
      if (dispatch)
        dispatch(state.tr.lift(range, target).scrollIntoView());
      return true;
    }
    let before = $cut.nodeBefore;
    if (deleteBarrier(state, $cut, dispatch, -1))
      return true;
    if ($cursor.parent.content.size == 0 && (textblockAt(before, "end") || NodeSelection.isSelectable(before))) {
      for (let depth = $cursor.depth;; depth--) {
        let delStep = replaceStep(state.doc, $cursor.before(depth), $cursor.after(depth), Slice.empty);
        if (delStep && delStep.slice.size < delStep.to - delStep.from) {
          if (dispatch) {
            let tr = state.tr.step(delStep);
            tr.setSelection(textblockAt(before, "end") ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos, -1)), -1) : NodeSelection.create(tr.doc, $cut.pos - before.nodeSize));
            dispatch(tr.scrollIntoView());
          }
          return true;
        }
        if (depth == 1 || $cursor.node(depth - 1).childCount > 1)
          break;
      }
    }
    if (before.isAtom && $cut.depth == $cursor.depth - 1) {
      if (dispatch)
        dispatch(state.tr.delete($cut.pos - before.nodeSize, $cut.pos).scrollIntoView());
      return true;
    }
    return false;
  };
  var joinTextblockBackward = (state, dispatch, view) => {
    let $cursor = atBlockStart(state, view);
    if (!$cursor)
      return false;
    let $cut = findCutBefore($cursor);
    return $cut ? joinTextblocksAround(state, $cut, dispatch) : false;
  };
  var joinTextblockForward = (state, dispatch, view) => {
    let $cursor = atBlockEnd(state, view);
    if (!$cursor)
      return false;
    let $cut = findCutAfter($cursor);
    return $cut ? joinTextblocksAround(state, $cut, dispatch) : false;
  };
  function joinTextblocksAround(state, $cut, dispatch) {
    let before = $cut.nodeBefore, beforeText = before, beforePos = $cut.pos - 1;
    for (;!beforeText.isTextblock; beforePos--) {
      if (beforeText.type.spec.isolating)
        return false;
      let child = beforeText.lastChild;
      if (!child)
        return false;
      beforeText = child;
    }
    let after = $cut.nodeAfter, afterText = after, afterPos = $cut.pos + 1;
    for (;!afterText.isTextblock; afterPos++) {
      if (afterText.type.spec.isolating)
        return false;
      let child = afterText.firstChild;
      if (!child)
        return false;
      afterText = child;
    }
    let step = replaceStep(state.doc, beforePos, afterPos, Slice.empty);
    if (!step || step.from != beforePos || step instanceof ReplaceStep && step.slice.size >= afterPos - beforePos)
      return false;
    if (dispatch) {
      let tr = state.tr.step(step);
      tr.setSelection(TextSelection.create(tr.doc, beforePos));
      dispatch(tr.scrollIntoView());
    }
    return true;
  }
  function textblockAt(node, side, only = false) {
    for (let scan = node;scan; scan = side == "start" ? scan.firstChild : scan.lastChild) {
      if (scan.isTextblock)
        return true;
      if (only && scan.childCount != 1)
        return false;
    }
    return false;
  }
  var selectNodeBackward = (state, dispatch, view) => {
    let { $head, empty } = state.selection, $cut = $head;
    if (!empty)
      return false;
    if ($head.parent.isTextblock) {
      if (view ? !view.endOfTextblock("backward", state) : $head.parentOffset > 0)
        return false;
      $cut = findCutBefore($head);
    }
    let node = $cut && $cut.nodeBefore;
    if (!node || !NodeSelection.isSelectable(node))
      return false;
    if (dispatch)
      dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $cut.pos - node.nodeSize)).scrollIntoView());
    return true;
  };
  function findCutBefore($pos) {
    if (!$pos.parent.type.spec.isolating)
      for (let i2 = $pos.depth - 1;i2 >= 0; i2--) {
        if ($pos.index(i2) > 0)
          return $pos.doc.resolve($pos.before(i2 + 1));
        if ($pos.node(i2).type.spec.isolating)
          break;
      }
    return null;
  }
  function atBlockEnd(state, view) {
    let { $cursor } = state.selection;
    if (!$cursor || (view ? !view.endOfTextblock("forward", state) : $cursor.parentOffset < $cursor.parent.content.size))
      return null;
    return $cursor;
  }
  var joinForward = (state, dispatch, view) => {
    let $cursor = atBlockEnd(state, view);
    if (!$cursor)
      return false;
    let $cut = findCutAfter($cursor);
    if (!$cut)
      return false;
    let after = $cut.nodeAfter;
    if (deleteBarrier(state, $cut, dispatch, 1))
      return true;
    if ($cursor.parent.content.size == 0 && (textblockAt(after, "start") || NodeSelection.isSelectable(after))) {
      let delStep = replaceStep(state.doc, $cursor.before(), $cursor.after(), Slice.empty);
      if (delStep && delStep.slice.size < delStep.to - delStep.from) {
        if (dispatch) {
          let tr = state.tr.step(delStep);
          tr.setSelection(textblockAt(after, "start") ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos)), 1) : NodeSelection.create(tr.doc, tr.mapping.map($cut.pos)));
          dispatch(tr.scrollIntoView());
        }
        return true;
      }
    }
    if (after.isAtom && $cut.depth == $cursor.depth - 1) {
      if (dispatch)
        dispatch(state.tr.delete($cut.pos, $cut.pos + after.nodeSize).scrollIntoView());
      return true;
    }
    return false;
  };
  var selectNodeForward = (state, dispatch, view) => {
    let { $head, empty } = state.selection, $cut = $head;
    if (!empty)
      return false;
    if ($head.parent.isTextblock) {
      if (view ? !view.endOfTextblock("forward", state) : $head.parentOffset < $head.parent.content.size)
        return false;
      $cut = findCutAfter($head);
    }
    let node = $cut && $cut.nodeAfter;
    if (!node || !NodeSelection.isSelectable(node))
      return false;
    if (dispatch)
      dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $cut.pos)).scrollIntoView());
    return true;
  };
  function findCutAfter($pos) {
    if (!$pos.parent.type.spec.isolating)
      for (let i2 = $pos.depth - 1;i2 >= 0; i2--) {
        let parent = $pos.node(i2);
        if ($pos.index(i2) + 1 < parent.childCount)
          return $pos.doc.resolve($pos.after(i2 + 1));
        if (parent.type.spec.isolating)
          break;
      }
    return null;
  }
  var joinUp = (state, dispatch) => {
    let sel = state.selection, nodeSel = sel instanceof NodeSelection, point;
    if (nodeSel) {
      if (sel.node.isTextblock || !canJoin(state.doc, sel.from))
        return false;
      point = sel.from;
    } else {
      point = joinPoint(state.doc, sel.from, -1);
      if (point == null)
        return false;
    }
    if (dispatch) {
      let tr = state.tr.join(point);
      if (nodeSel)
        tr.setSelection(NodeSelection.create(tr.doc, point - state.doc.resolve(point).nodeBefore.nodeSize));
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
  var joinDown = (state, dispatch) => {
    let sel = state.selection, point;
    if (sel instanceof NodeSelection) {
      if (sel.node.isTextblock || !canJoin(state.doc, sel.to))
        return false;
      point = sel.to;
    } else {
      point = joinPoint(state.doc, sel.to, 1);
      if (point == null)
        return false;
    }
    if (dispatch)
      dispatch(state.tr.join(point).scrollIntoView());
    return true;
  };
  var lift2 = (state, dispatch) => {
    let { $from, $to } = state.selection;
    let range = $from.blockRange($to), target = range && liftTarget(range);
    if (target == null)
      return false;
    if (dispatch)
      dispatch(state.tr.lift(range, target).scrollIntoView());
    return true;
  };
  var newlineInCode = (state, dispatch) => {
    let { $head, $anchor } = state.selection;
    if (!$head.parent.type.spec.code || !$head.sameParent($anchor))
      return false;
    if (dispatch)
      dispatch(state.tr.insertText(`
`).scrollIntoView());
    return true;
  };
  function defaultBlockAt(match) {
    for (let i2 = 0;i2 < match.edgeCount; i2++) {
      let { type } = match.edge(i2);
      if (type.isTextblock && !type.hasRequiredAttrs())
        return type;
    }
    return null;
  }
  var exitCode = (state, dispatch) => {
    let { $head, $anchor } = state.selection;
    if (!$head.parent.type.spec.code || !$head.sameParent($anchor))
      return false;
    let above = $head.node(-1), after = $head.indexAfter(-1), type = defaultBlockAt(above.contentMatchAt(after));
    if (!type || !above.canReplaceWith(after, after, type))
      return false;
    if (dispatch) {
      let pos = $head.after(), tr = state.tr.replaceWith(pos, pos, type.createAndFill());
      tr.setSelection(Selection.near(tr.doc.resolve(pos), 1));
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
  var createParagraphNear = (state, dispatch) => {
    let sel = state.selection, { $from, $to } = sel;
    if (sel instanceof AllSelection || $from.parent.inlineContent || $to.parent.inlineContent)
      return false;
    let type = defaultBlockAt($to.parent.contentMatchAt($to.indexAfter()));
    if (!type || !type.isTextblock)
      return false;
    if (dispatch) {
      let side = (!$from.parentOffset && $to.index() < $to.parent.childCount ? $from : $to).pos;
      let tr = state.tr.insert(side, type.createAndFill());
      tr.setSelection(TextSelection.create(tr.doc, side + 1));
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
  var liftEmptyBlock = (state, dispatch) => {
    let { $cursor } = state.selection;
    if (!$cursor || $cursor.parent.content.size)
      return false;
    if ($cursor.depth > 1 && $cursor.after() != $cursor.end(-1)) {
      let before = $cursor.before();
      if (canSplit(state.doc, before)) {
        if (dispatch)
          dispatch(state.tr.split(before).scrollIntoView());
        return true;
      }
    }
    let range = $cursor.blockRange(), target = range && liftTarget(range);
    if (target == null)
      return false;
    if (dispatch)
      dispatch(state.tr.lift(range, target).scrollIntoView());
    return true;
  };
  function splitBlockAs(splitNode) {
    return (state, dispatch) => {
      if (state.selection instanceof NodeSelection && state.selection.node.isBlock) {
        let { $from: $from2 } = state.selection;
        if (!$from2.parentOffset || !canSplit(state.doc, $from2.pos))
          return false;
        if (dispatch)
          dispatch(state.tr.split($from2.pos).scrollIntoView());
        return true;
      }
      if (!state.selection.$from.depth)
        return false;
      let tr = state.tr;
      if (!state.selection.empty && (state.selection instanceof TextSelection || state.selection instanceof AllSelection))
        tr.deleteSelection();
      let { $from } = tr.selection, mapFrom = tr.steps.length;
      let types = [];
      let splitDepth, deflt, atEnd = false, atStart = false;
      for (let d = $from.depth;; d--) {
        let node = $from.node(d);
        if (node.isBlock) {
          atEnd = $from.end(d) == $from.pos + ($from.depth - d);
          atStart = $from.start(d) == $from.pos - ($from.depth - d);
          deflt = defaultBlockAt($from.node(d - 1).contentMatchAt($from.indexAfter(d - 1)));
          let splitType = splitNode && splitNode($from.parent, atEnd, $from);
          types.unshift(splitType || (atEnd && deflt ? { type: deflt } : null));
          splitDepth = d;
          break;
        } else {
          if (d == 1)
            return false;
          types.unshift(null);
        }
      }
      let splitPos = $from.pos;
      let can = canSplit(tr.doc, splitPos, types.length, types);
      if (!can) {
        types[0] = deflt ? { type: deflt } : null;
        can = canSplit(tr.doc, splitPos, types.length, types);
      }
      if (!can)
        return false;
      tr.split(splitPos, types.length, types);
      if (!atEnd && atStart && $from.node(splitDepth).type != deflt) {
        let mapping = tr.mapping.slice(mapFrom);
        let first = mapping.map($from.before(splitDepth)), $first = tr.doc.resolve(first);
        if (deflt && $from.node(splitDepth - 1).canReplaceWith($first.index(), $first.index() + 1, deflt))
          tr.setNodeMarkup(mapping.map($from.before(splitDepth)), deflt);
      }
      if (dispatch)
        dispatch(tr.scrollIntoView());
      return true;
    };
  }
  var splitBlock = splitBlockAs();
  var splitBlockKeepMarks = (state, dispatch) => {
    return splitBlock(state, dispatch && ((tr) => {
      let marks2 = state.storedMarks || state.selection.$to.parentOffset && state.selection.$from.marks();
      if (marks2)
        tr.ensureMarks(marks2);
      dispatch(tr);
    }));
  };
  var selectParentNode = (state, dispatch) => {
    let { $from, to } = state.selection, pos;
    let same = $from.sharedDepth(to);
    if (same == 0)
      return false;
    pos = $from.before(same);
    if (dispatch)
      dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
    return true;
  };
  var selectAll = (state, dispatch) => {
    if (dispatch)
      dispatch(state.tr.setSelection(new AllSelection(state.doc)));
    return true;
  };
  function joinMaybeClear(state, $pos, dispatch) {
    let { nodeBefore: before, nodeAfter: after } = $pos, index = $pos.index();
    if (!before || !after || !before.type.compatibleContent(after.type))
      return false;
    if (!before.content.size && $pos.parent.canReplace(index - 1, index)) {
      if (dispatch)
        dispatch(state.tr.delete($pos.pos - before.nodeSize, $pos.pos).scrollIntoView());
      return true;
    }
    if (!$pos.parent.canReplace(index, index + 1) || !(after.isTextblock || canJoin(state.doc, $pos.pos)))
      return false;
    if (dispatch)
      dispatch(state.tr.join($pos.pos).scrollIntoView());
    return true;
  }
  function deleteBarrier(state, $cut, dispatch, dir) {
    let { nodeBefore: before, nodeAfter: after } = $cut, conn, match;
    let isolated = before.type.spec.isolating || after.type.spec.isolating;
    if (!isolated && joinMaybeClear(state, $cut, dispatch))
      return true;
    let canDelAfter = !isolated && $cut.parent.canReplace($cut.index(), $cut.index() + 1);
    if (canDelAfter && (conn = (match = before.contentMatchAt(before.childCount)).findWrapping(after.type)) && match.matchType(conn[0] || after.type).validEnd) {
      if (dispatch) {
        let end = $cut.pos + after.nodeSize, wrap2 = Fragment.empty;
        for (let i2 = conn.length - 1;i2 >= 0; i2--)
          wrap2 = Fragment.from(conn[i2].create(null, wrap2));
        wrap2 = Fragment.from(before.copy(wrap2));
        let tr = state.tr.step(new ReplaceAroundStep($cut.pos - 1, end, $cut.pos, end, new Slice(wrap2, 1, 0), conn.length, true));
        let $joinAt = tr.doc.resolve(end + 2 * conn.length);
        if ($joinAt.nodeAfter && $joinAt.nodeAfter.type == before.type && canJoin(tr.doc, $joinAt.pos))
          tr.join($joinAt.pos);
        dispatch(tr.scrollIntoView());
      }
      return true;
    }
    let selAfter = after.type.spec.isolating || dir > 0 && isolated ? null : Selection.findFrom($cut, 1);
    let range = selAfter && selAfter.$from.blockRange(selAfter.$to), target = range && liftTarget(range);
    if (target != null && target >= $cut.depth) {
      if (dispatch)
        dispatch(state.tr.lift(range, target).scrollIntoView());
      return true;
    }
    if (canDelAfter && textblockAt(after, "start", true) && textblockAt(before, "end")) {
      let at = before, wrap2 = [];
      for (;; ) {
        wrap2.push(at);
        if (at.isTextblock)
          break;
        at = at.lastChild;
      }
      let afterText = after, afterDepth = 1;
      for (;!afterText.isTextblock; afterText = afterText.firstChild)
        afterDepth++;
      if (at.canReplace(at.childCount, at.childCount, afterText.content)) {
        if (dispatch) {
          let end = Fragment.empty;
          for (let i2 = wrap2.length - 1;i2 >= 0; i2--)
            end = Fragment.from(wrap2[i2].copy(end));
          let tr = state.tr.step(new ReplaceAroundStep($cut.pos - wrap2.length, $cut.pos + after.nodeSize, $cut.pos + afterDepth, $cut.pos + after.nodeSize - afterDepth, new Slice(end, wrap2.length, 0), 0, true));
          dispatch(tr.scrollIntoView());
        }
        return true;
      }
    }
    return false;
  }
  function selectTextblockSide(side) {
    return function(state, dispatch) {
      let sel = state.selection, $pos = side < 0 ? sel.$from : sel.$to;
      let depth = $pos.depth;
      while ($pos.node(depth).isInline) {
        if (!depth)
          return false;
        depth--;
      }
      if (!$pos.node(depth).isTextblock)
        return false;
      if (dispatch)
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, side < 0 ? $pos.start(depth) : $pos.end(depth))));
      return true;
    };
  }
  var selectTextblockStart = selectTextblockSide(-1);
  var selectTextblockEnd = selectTextblockSide(1);
  function wrapIn(nodeType, attrs = null) {
    return function(state, dispatch) {
      let { $from, $to } = state.selection;
      let range = $from.blockRange($to), wrapping = range && findWrapping(range, nodeType, attrs);
      if (!wrapping)
        return false;
      if (dispatch)
        dispatch(state.tr.wrap(range, wrapping).scrollIntoView());
      return true;
    };
  }
  function setBlockType2(nodeType, attrs = null) {
    return function(state, dispatch) {
      let applicable = false;
      for (let i2 = 0;i2 < state.selection.ranges.length && !applicable; i2++) {
        let { $from: { pos: from }, $to: { pos: to } } = state.selection.ranges[i2];
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (applicable)
            return false;
          if (!node.isTextblock || node.hasMarkup(nodeType, attrs))
            return;
          if (node.type == nodeType) {
            applicable = true;
          } else {
            let $pos = state.doc.resolve(pos), index = $pos.index();
            applicable = $pos.parent.canReplaceWith(index, index + 1, nodeType);
          }
        });
      }
      if (!applicable)
        return false;
      if (dispatch) {
        let tr = state.tr;
        for (let i2 = 0;i2 < state.selection.ranges.length; i2++) {
          let { $from: { pos: from }, $to: { pos: to } } = state.selection.ranges[i2];
          tr.setBlockType(from, to, nodeType, attrs);
        }
        dispatch(tr.scrollIntoView());
      }
      return true;
    };
  }
  function markApplies(doc2, ranges, type, enterAtoms) {
    for (let i2 = 0;i2 < ranges.length; i2++) {
      let { $from, $to } = ranges[i2];
      let can = $from.depth == 0 ? doc2.inlineContent && doc2.type.allowsMarkType(type) : false;
      doc2.nodesBetween($from.pos, $to.pos, (node, pos) => {
        if (can || !enterAtoms && node.isAtom && node.isInline && pos >= $from.pos && pos + node.nodeSize <= $to.pos)
          return false;
        can = node.inlineContent && node.type.allowsMarkType(type);
      });
      if (can)
        return true;
    }
    return false;
  }
  function removeInlineAtoms(ranges) {
    let result = [];
    for (let i2 = 0;i2 < ranges.length; i2++) {
      let { $from, $to } = ranges[i2];
      $from.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
        if (node.isAtom && node.content.size && node.isInline && pos >= $from.pos && pos + node.nodeSize <= $to.pos) {
          if (pos + 1 > $from.pos)
            result.push(new SelectionRange($from, $from.doc.resolve(pos + 1)));
          $from = $from.doc.resolve(pos + 1 + node.content.size);
          return false;
        }
      });
      if ($from.pos < $to.pos)
        result.push(new SelectionRange($from, $to));
    }
    return result;
  }
  function toggleMark(markType, attrs = null, options) {
    let removeWhenPresent = (options && options.removeWhenPresent) !== false;
    let enterAtoms = (options && options.enterInlineAtoms) !== false;
    let dropSpace = !(options && options.includeWhitespace);
    return function(state, dispatch) {
      let { empty, $cursor, ranges } = state.selection;
      if (empty && !$cursor || !markApplies(state.doc, ranges, markType, enterAtoms))
        return false;
      if (dispatch) {
        if ($cursor) {
          if (markType.isInSet(state.storedMarks || $cursor.marks()))
            dispatch(state.tr.removeStoredMark(markType));
          else
            dispatch(state.tr.addStoredMark(markType.create(attrs)));
        } else {
          let add2, tr = state.tr;
          if (!enterAtoms)
            ranges = removeInlineAtoms(ranges);
          if (removeWhenPresent) {
            add2 = !ranges.some((r) => state.doc.rangeHasMark(r.$from.pos, r.$to.pos, markType));
          } else {
            add2 = !ranges.every((r) => {
              let missing = false;
              tr.doc.nodesBetween(r.$from.pos, r.$to.pos, (node, pos, parent) => {
                if (missing)
                  return false;
                missing = !markType.isInSet(node.marks) && !!parent && parent.type.allowsMarkType(markType) && !(node.isText && /^\s*$/.test(node.textBetween(Math.max(0, r.$from.pos - pos), Math.min(node.nodeSize, r.$to.pos - pos))));
              });
              return !missing;
            });
          }
          for (let i2 = 0;i2 < ranges.length; i2++) {
            let { $from, $to } = ranges[i2];
            if (!add2) {
              tr.removeMark($from.pos, $to.pos, markType);
            } else {
              let from = $from.pos, to = $to.pos, start = $from.nodeAfter, end = $to.nodeBefore;
              let spaceStart = dropSpace && start && start.isText ? /^\s*/.exec(start.text)[0].length : 0;
              let spaceEnd = dropSpace && end && end.isText ? /\s*$/.exec(end.text)[0].length : 0;
              if (from + spaceStart < to) {
                from += spaceStart;
                to -= spaceEnd;
              }
              tr.addMark(from, to, markType.create(attrs));
            }
          }
          dispatch(tr.scrollIntoView());
        }
      }
      return true;
    };
  }
  function wrapDispatchForJoin(dispatch, isJoinable) {
    return (tr) => {
      if (!tr.isGeneric)
        return dispatch(tr);
      let ranges = [];
      for (let i2 = 0;i2 < tr.mapping.maps.length; i2++) {
        let map = tr.mapping.maps[i2];
        for (let j = 0;j < ranges.length; j++)
          ranges[j] = map.map(ranges[j]);
        map.forEach((_s, _e, from, to) => ranges.push(from, to));
      }
      let joinable3 = [];
      for (let i2 = 0;i2 < ranges.length; i2 += 2) {
        let from = ranges[i2], to = ranges[i2 + 1];
        let $from = tr.doc.resolve(from), depth = $from.sharedDepth(to), parent = $from.node(depth);
        for (let index = $from.indexAfter(depth), pos = $from.after(depth + 1);pos <= to; ++index) {
          let after = parent.maybeChild(index);
          if (!after)
            break;
          if (index && joinable3.indexOf(pos) == -1) {
            let before = parent.child(index - 1);
            if (before.type == after.type && isJoinable(before, after))
              joinable3.push(pos);
          }
          pos += after.nodeSize;
        }
      }
      joinable3.sort((a2, b2) => a2 - b2);
      for (let i2 = joinable3.length - 1;i2 >= 0; i2--) {
        if (canJoin(tr.doc, joinable3[i2]))
          tr.join(joinable3[i2]);
      }
      dispatch(tr);
    };
  }
  function autoJoin(command, isJoinable) {
    let canJoin2 = Array.isArray(isJoinable) ? (node) => isJoinable.indexOf(node.type.name) > -1 : isJoinable;
    return (state, dispatch, view) => command(state, dispatch && wrapDispatchForJoin(dispatch, canJoin2), view);
  }
  function chainCommands(...commands) {
    return function(state, dispatch, view) {
      for (let i2 = 0;i2 < commands.length; i2++)
        if (commands[i2](state, dispatch, view))
          return true;
      return false;
    };
  }
  var backspace = chainCommands(deleteSelection, joinBackward, selectNodeBackward);
  var del = chainCommands(deleteSelection, joinForward, selectNodeForward);
  var pcBaseKeymap = {
    Enter: chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
    "Mod-Enter": exitCode,
    Backspace: backspace,
    "Mod-Backspace": backspace,
    "Shift-Backspace": backspace,
    Delete: del,
    "Mod-Delete": del,
    "Mod-a": selectAll
  };
  var macBaseKeymap = {
    "Ctrl-h": pcBaseKeymap["Backspace"],
    "Alt-Backspace": pcBaseKeymap["Mod-Backspace"],
    "Ctrl-d": pcBaseKeymap["Delete"],
    "Ctrl-Alt-Backspace": pcBaseKeymap["Mod-Delete"],
    "Alt-Delete": pcBaseKeymap["Mod-Delete"],
    "Alt-d": pcBaseKeymap["Mod-Delete"],
    "Ctrl-a": selectTextblockStart,
    "Ctrl-e": selectTextblockEnd
  };
  for (let key in pcBaseKeymap)
    macBaseKeymap[key] = pcBaseKeymap[key];
  var mac = typeof navigator != "undefined" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os != "undefined" && os.platform ? os.platform() == "darwin" : false;

  // apps/ios/Tests/EditorCoreTests/Fixtures/Upstream/prosemirror-commands.test.ts.txt
  var evameResults = [];
  var evameSuites = [];
  function describe(name, run) {
    evameSuites.push(name);
    try {
      run();
    } finally {
      evameSuites.pop();
    }
  }
  function it(name, run) {
    const result = { command: evameSuites.join(" / "), name, error: null };
    try {
      run();
    } catch (error) {
      result.error = String(error);
    }
    evameResults.push(result);
  }
  function t(node) {
    return node.tag;
  }
  function selFor(doc2) {
    let a2 = t(doc2).a;
    if (a2 != null) {
      let $a = doc2.resolve(a2);
      if ($a.parent.inlineContent)
        return new TextSelection($a, t(doc2).b != null ? doc2.resolve(t(doc2).b) : undefined);
      else
        return new NodeSelection($a);
    }
    return Selection.atStart(doc2);
  }
  function mkState(doc2) {
    return EditorState.create({ doc: doc2, selection: selFor(doc2) });
  }
  function apply(doc2, command, result) {
    let state = mkState(doc2);
    command(state, (tr) => state = state.apply(tr));
    ist_default(state.doc, result || doc2, eq);
    if (result && t(result).a != null)
      ist_default(state.selection, selFor(result), eq);
  }
  describe("joinBackward", () => {
    it("can join paragraphs", () => apply(doc(p("hi"), p("<a>there")), joinBackward, doc(p("hithere"))));
    it("can join out of a nested node", () => apply(doc(p("hi"), blockquote(p("<a>there"))), joinBackward, doc(p("hi"), p("there"))));
    it("moves a block into an adjacent wrapper", () => apply(doc(blockquote(p("hi")), p("<a>there")), joinBackward, doc(blockquote(p("hi"), p("there")))));
    it("moves a block into an adjacent wrapper from another wrapper", () => apply(doc(blockquote(p("hi")), blockquote(p("<a>there"))), joinBackward, doc(blockquote(p("hi"), p("there")))));
    it("joins the wrapper to a subsequent one if applicable", () => apply(doc(blockquote(p("hi")), p("<a>there"), blockquote(p("x"))), joinBackward, doc(blockquote(p("hi"), p("there"), p("x")))));
    it("moves a block into a list item", () => apply(doc(ul(li(p("hi"))), p("<a>there")), joinBackward, doc(ul(li(p("hi")), li(p("there"))))));
    it("joins lists", () => apply(doc(ul(li(p("hi"))), ul(li(p("<a>there")))), joinBackward, doc(ul(li(p("hi")), li(p("there"))))));
    it("joins list items", () => apply(doc(ul(li(p("hi")), li(p("<a>there")))), joinBackward, doc(ul(li(p("hi"), p("there"))))));
    it("lifts out of a list at the start", () => apply(doc(ul(li(p("<a>there")))), joinBackward, doc(p("<a>there"))));
    it("joins lists before and after", () => apply(doc(ul(li(p("hi"))), p("<a>there"), ul(li(p("x")))), joinBackward, doc(ul(li(p("hi")), li(p("there")), li(p("x"))))));
    it("deletes leaf nodes before", () => apply(doc(hr, p("<a>there")), joinBackward, doc(p("there"))));
    it("lifts before it deletes", () => apply(doc(hr, blockquote(p("<a>there"))), joinBackward, doc(hr, p("there"))));
    it("does nothing at start of doc", () => apply(doc(p("<a>foo")), joinBackward, null));
    it("can join single-textblock-child nodes", () => {
      let s = new Schema({
        nodes: {
          text: { inline: true },
          doc: { content: "block+" },
          block: { content: "para" },
          para: { content: "text*" }
        }
      });
      let doc2 = s.node("doc", null, [
        s.node("block", null, [s.node("para", null, [s.text("a")])]),
        s.node("block", null, [s.node("para", null, [s.text("b")])])
      ]);
      let state = EditorState.create({ doc: doc2, selection: TextSelection.near(doc2.resolve(7)) });
      ist_default(joinBackward(state, (tr) => state = state.apply(tr)));
      ist_default(state.doc.toString(), 'doc(block(para("ab")))');
    });
    it("doesn't return true on empty blocks that can't be deleted", () => apply(doc(p("a"), ul(li(p("<a>"), ul(li("b"))))), joinBackward, null));
    it("doesn't join surrounding nodes of different types", () => apply(doc(ul(li(p("a"))), p("<a>"), ol(li(p("b")))), joinBackward, doc(ul(li(p("a")), li(p("<a>"))), ol(li(p("b"))))));
  });
  describe("joinTextblockBackward", () => {
    it("can join paragraphs", () => apply(doc(p("hi"), p("<a>there")), joinTextblockBackward, doc(p("hi<a>there"))));
    it("can join if second block is wrapped", () => apply(doc(p("hi"), ul(li(p("<a>there")))), joinTextblockBackward, doc(p("hi<a>there"))));
    it("can join if first block is wrapped", () => apply(doc(blockquote(p("hi")), p("<a>there")), joinTextblockBackward, doc(blockquote(p("hi<a>there")))));
    it("does nothing at start of doc", () => apply(doc(p("<a>foo")), joinTextblockBackward, null));
    it("can join if inside a nested block", () => apply(doc(blockquote(blockquote(p("hi")), p("<a>there"))), joinTextblockBackward, doc(blockquote(blockquote(p("hi<a>there"))))));
  });
  describe("selectNodeBackward", () => {
    it("selects the node before the cut", () => apply(doc(blockquote(p("a")), blockquote(p("<a>b"))), selectNodeBackward, doc("<a>", blockquote(p("a")), blockquote(p("b")))));
    it("does nothing when not at the start of the textblock", () => apply(doc(p("a<a>b")), selectNodeBackward, null));
  });
  describe("deleteSelection", () => {
    it("deletes part of a text node", () => apply(doc(p("f<a>o<b>o")), deleteSelection, doc(p("fo"))));
    it("can delete across blocks", () => apply(doc(p("f<a>oo"), p("ba<b>r")), deleteSelection, doc(p("fr"))));
    it("deletes node selections", () => apply(doc(p("foo"), "<a>", hr()), deleteSelection, doc(p("foo"))));
    it("moves selection after deleted node", () => apply(doc(p("a"), "<a>", p("b"), blockquote(p("c"))), deleteSelection, doc(p("a"), blockquote(p("<a>c")))));
    it("moves selection before deleted node at end", () => apply(doc(p("a"), "<a>", p("b")), deleteSelection, doc(p("a<a>"))));
  });
  describe("joinForward", () => {
    it("joins two textblocks", () => apply(doc(p("foo<a>"), p("bar")), joinForward, doc(p("foobar"))));
    it("keeps type of second node when first is empty", () => apply(doc(p("x"), p("<a>"), h1("hi")), joinForward, doc(p("x"), h1("<a>hi"))));
    it("clears nodes from joined node that wouldn't be allowed in target node", () => apply(doc(pre("foo<a>"), p("bar", img())), joinForward, doc(pre("foo<a>bar"))));
    it("does nothing at the end of the document", () => apply(doc(p("foo<a>")), joinForward, null));
    it("deletes a leaf node after the current block", () => apply(doc(p("foo<a>"), hr(), p("bar")), joinForward, doc(p("foo"), p("bar"))));
    it("pulls the next block into the current list item", () => apply(doc(ul(li(p("a<a>")), li(p("b")))), joinForward, doc(ul(li(p("a"), p("b"))))));
    it("joins two blocks inside of a list item", () => apply(doc(ul(li(p("a<a>"), p("b")))), joinForward, doc(ul(li(p("ab"))))));
    it("pulls the next block into a blockquote", () => apply(doc(blockquote(p("foo<a>")), p("bar")), joinForward, doc(blockquote(p("foo<a>"), p("bar")))));
    it("joins two blockquotes", () => apply(doc(blockquote(p("hi<a>")), blockquote(p("there"))), joinForward, doc(blockquote(p("hi"), p("there")))));
    it("pulls the next block outside of a wrapping blockquote", () => apply(doc(p("foo<a>"), blockquote(p("bar"))), joinForward, doc(p("foo"), p("bar"))));
    it("joins two lists", () => apply(doc(ul(li(p("hi<a>"))), ul(li(p("there")))), joinForward, doc(ul(li(p("hi")), li(p("there"))))));
    it("does nothing in a nested node at the end of the document", () => apply(doc(ul(li(p("there<a>")))), joinForward, null));
    it("deletes a leaf node at the end of the document", () => apply(doc(p("there<a>"), hr()), joinForward, doc(p("there"))));
    it("moves before it deletes a leaf node", () => apply(doc(blockquote(p("there<a>")), hr()), joinForward, doc(blockquote(p("there"), hr()))));
    it("does nothing when it can't join", () => apply(doc(p("foo<a>"), ul(li(p("bar"), ul(li(p("baz")))))), joinForward, null));
  });
  describe("joinTextblockForward", () => {
    it("can join paragraphs", () => apply(doc(p("hi<a>"), p("there")), joinTextblockForward, doc(p("hi<a>there"))));
    it("can join if second block is wrapped", () => apply(doc(p("hi<a>"), ul(li(p("there")))), joinTextblockForward, doc(p("hi<a>there"))));
    it("can join if first block is wrapped", () => apply(doc(blockquote(p("hi<a>")), p("there")), joinTextblockForward, doc(blockquote(p("hi<a>there")))));
    it("does nothing at end of doc", () => apply(doc(p("foo<a>")), joinTextblockForward, null));
  });
  describe("selectNodeForward", () => {
    it("selects the next node", () => apply(doc(p("foo<a>"), ul(li(p("bar"), ul(li(p("baz")))))), selectNodeForward, doc(p("foo<a>"), "<a>", ul(li(p("bar"), ul(li(p("baz"))))))));
    it("does nothing at end of document", () => apply(doc(p("foo<a>")), selectNodeForward, null));
  });
  describe("joinUp", () => {
    it("joins identical parent blocks", () => apply(doc(blockquote(p("foo")), blockquote(p("<a>bar"))), joinUp, doc(blockquote(p("foo"), p("<a>bar")))));
    it("does nothing in the first block", () => apply(doc(blockquote(p("<a>foo")), blockquote(p("bar"))), joinUp, null));
    it("joins lists", () => apply(doc(ul(li(p("foo"))), ul(li(p("<a>bar")))), joinUp, doc(ul(li(p("foo")), li(p("bar"))))));
    it("joins list items", () => apply(doc(ul(li(p("foo")), li(p("<a>bar")))), joinUp, doc(ul(li(p("foo"), p("bar"))))));
    it("doesn't look at ancestors when a block is selected", () => apply(doc(ul(li(p("foo")), li("<a>", p("bar")))), joinUp, null));
    it("can join selected block nodes", () => apply(doc(ul(li(p("foo")), "<a>", li(p("bar")))), joinUp, doc(ul("<a>", li(p("foo"), p("bar"))))));
  });
  describe("joinDown", () => {
    it("joins parent blocks", () => apply(doc(blockquote(p("foo<a>")), blockquote(p("bar"))), joinDown, doc(blockquote(p("foo<a>"), p("bar")))));
    it("doesn't join with the block before", () => apply(doc(blockquote(p("foo")), blockquote(p("<a>bar"))), joinDown, null));
    it("joins lists", () => apply(doc(ul(li(p("foo<a>"))), ul(li(p("bar")))), joinDown, doc(ul(li(p("foo")), li(p("bar"))))));
    it("joins list items", () => apply(doc(ul(li(p("<a>foo")), li(p("bar")))), joinDown, doc(ul(li(p("foo"), p("bar"))))));
    it("doesn't look at parent nodes of a selected node", () => apply(doc(ul(li("<a>", p("foo")), li(p("bar")))), joinDown, null));
    it("can join selected nodes", () => apply(doc(ul("<a>", li(p("foo")), li(p("bar")))), joinDown, doc(ul("<a>", li(p("foo"), p("bar"))))));
  });
  describe("lift", () => {
    it("lifts out of a parent block", () => apply(doc(blockquote(p("<a>foo"))), lift2, doc(p("<a>foo"))));
    it("splits the parent block when necessary", () => apply(doc(blockquote(p("foo"), p("<a>bar"), p("baz"))), lift2, doc(blockquote(p("foo")), p("bar"), blockquote(p("baz")))));
    it("can lift out of a list", () => apply(doc(ul(li(p("<a>foo")))), lift2, doc(p("foo"))));
    it("does nothing for a top-level block", () => apply(doc(p("<a>foo")), lift2, null));
    it("lifts out of the innermost parent", () => apply(doc(blockquote(ul(li(p("foo<a>"))))), lift2, doc(blockquote(p("foo<a>")))));
    it("can lift a node selection", () => apply(doc(blockquote("<a>", ul(li(p("foo"))))), lift2, doc("<a>", ul(li(p("foo"))))));
    it("lifts out of a nested list", () => apply(doc(ul(li(p("one"), ul(li(p("<a>sub1")), li(p("sub2")))), li(p("two")))), lift2, doc(ul(li(p("one"), p("<a>sub1"), ul(li(p("sub2")))), li(p("two"))))));
  });
  describe("wrapIn", () => {
    let wrap2 = wrapIn(schema2.nodes.blockquote);
    it("can wrap a paragraph", () => apply(doc(p("fo<a>o")), wrap2, doc(blockquote(p("foo")))));
    it("wraps multiple pragraphs", () => apply(doc(p("fo<a>o"), p("bar"), p("ba<b>z"), p("quux")), wrap2, doc(blockquote(p("foo"), p("bar"), p("baz")), p("quux"))));
    it("wraps an already wrapped node", () => apply(doc(blockquote(p("fo<a>o"))), wrap2, doc(blockquote(blockquote(p("foo"))))));
    it("can wrap a node selection", () => apply(doc("<a>", ul(li(p("foo")))), wrap2, doc(blockquote(ul(li(p("foo")))))));
  });
  describe("splitBlock", () => {
    it("splits a paragraph at the end", () => apply(doc(p("foo<a>")), splitBlock, doc(p("foo"), p())));
    it("split a pragraph in the middle", () => apply(doc(p("foo<a>bar")), splitBlock, doc(p("foo"), p("bar"))));
    it("splits a paragraph from a heading", () => apply(doc(h1("foo<a>")), splitBlock, doc(h1("foo"), p())));
    it("splits a heading in two when in the middle", () => apply(doc(h1("foo<a>bar")), splitBlock, doc(h1("foo"), h1("bar"))));
    it("deletes selected content", () => apply(doc(p("fo<a>ob<b>ar")), splitBlock, doc(p("fo"), p("ar"))));
    it("splits a parent block when a node is selected", () => apply(doc(ol(li(p("a")), "<a>", li(p("b")), li(p("c")))), splitBlock, doc(ol(li(p("a"))), ol(li(p("b")), li(p("c"))))));
    it("doesn't split the parent block when at the start", () => apply(doc(ol("<a>", li(p("a")), li(p("b")), li(p("c")))), splitBlock, null));
    it("splits off a normal paragraph when splitting at the start of a textblock", () => apply(doc(h1("<a>foo")), splitBlock, doc(p(), h1("foo"))));
    const hSchema = new Schema({
      nodes: schema2.spec.nodes.update("heading", {
        content: "inline*"
      }).update("doc", {
        content: "heading block*"
      }).addToEnd("span", {
        inline: true,
        group: "inline",
        content: "inline*"
      })
    });
    function hDoc(a2) {
      const hDoc2 = hSchema.node("doc", null, [
        hSchema.node("heading", { level: 1 }, hSchema.text("foobar"))
      ]);
      hDoc2.tag = { a: a2 };
      return hDoc2;
    }
    it("splits a paragraph from a heading when a double heading isn't allowed", () => apply(hDoc(4), splitBlock, hSchema.node("doc", null, [
      hSchema.node("heading", { level: 1 }, hSchema.text("foo")),
      hSchema.node("paragraph", null, hSchema.text("bar"))
    ])));
    it("won't try to reset the type of an empty leftover when the schema forbids it", () => apply(hDoc(1), splitBlock, hSchema.node("doc", null, [
      hSchema.node("heading", { level: 1 }),
      hSchema.node("paragraph", null, hSchema.text("foobar"))
    ])));
    it("can split an inline node", () => {
      let d = hSchema.node("doc", null, [
        hSchema.node("heading", { level: 1 }, [
          hSchema.node("span", null, hSchema.text("abcd"))
        ])
      ]);
      d.tag = { a: 4 };
      apply(d, splitBlock, hSchema.node("doc", null, [
        hSchema.node("heading", { level: 1 }, hSchema.node("span", null, hSchema.text("ab"))),
        hSchema.node("paragraph", null, hSchema.node("span", null, hSchema.text("cd")))
      ]));
    });
    it("prefers textblocks", () => {
      let s = new Schema({ nodes: {
        text: {},
        para: { content: "text*", toDOM() {
          return ["p", 0];
        } },
        section: { content: "para+", toDOM() {
          return ["section", 0];
        } },
        doc: { content: "para* section*" }
      } });
      let doc2 = s.node("doc", null, [s.node("para", null, [s.text("hello")])]);
      doc2.tag = { a: 3 };
      apply(doc2, splitBlock, s.node("doc", null, [
        s.node("para", null, [s.text("he")]),
        s.node("para", null, [s.text("llo")])
      ]));
    });
  });
  describe("splitBlockAs", () => {
    it("splits to the appropriate type", () => apply(doc(p("on<a>e")), splitBlockAs((n) => ({ type: n.type.schema.nodes.heading, attrs: { level: 1 } })), doc(p("on"), h1("<a>e"))));
    it("passes an end-of-block flag", () => apply(doc(p("one<a>")), splitBlockAs((n, e) => e ? { type: n.type.schema.nodes.code_block } : null), doc(p("one"), pre("<a>"))));
  });
  describe("splitBlockKeepMarks", () => {
    it("keeps marks when used after marked text", () => {
      let state = mkState(doc(p(strong("foo<a>"), "bar")));
      splitBlockKeepMarks(state, (tr) => state = state.apply(tr));
      ist_default(state.storedMarks.length, 1);
    });
    it("preserves the stored marks", () => {
      let state = mkState(doc(p(em("foo<a>"))));
      toggleMark(schema2.marks.strong)(state, (tr) => state = state.apply(tr));
      splitBlockKeepMarks(state, (tr) => state = state.apply(tr));
      ist_default(state.storedMarks.length, 2);
    });
  });
  describe("liftEmptyBlock", () => {
    it("splits the parent block when there are sibling before", () => apply(doc(blockquote(p("foo"), p("<a>"), p("bar"))), liftEmptyBlock, doc(blockquote(p("foo")), blockquote(p(), p("bar")))));
    it("lifts the last child out of its parent", () => apply(doc(blockquote(p("foo"), p("<a>"))), liftEmptyBlock, doc(blockquote(p("foo")), p())));
    it("lifts an only child", () => apply(doc(blockquote(p("foo")), blockquote(p("<a>"))), liftEmptyBlock, doc(blockquote(p("foo")), p("<a>"))));
    it("does not violate schema constraints", () => apply(doc(ul(li(p("<a>foo"), blockquote(p("bar"))))), liftEmptyBlock, null));
    it("lifts out of a list", () => apply(doc(ul(li(p("hi")), li(p("<a>")))), liftEmptyBlock, doc(ul(li(p("hi"))), p())));
  });
  describe("createParagraphNear", () => {
    it("creates a paragraph before a selected node at the start of the doc", () => apply(doc("<a>", hr(), hr()), createParagraphNear, doc(p(), hr(), hr())));
    it("creates a paragraph after a lone selected node", () => apply(doc("<a>", hr()), createParagraphNear, doc(hr(), p())));
    it("creates a paragraph after selected nodes not at the start of the doc", () => apply(doc(p(), "<a>", hr()), createParagraphNear, doc(p(), hr(), p())));
  });
  describe("setBlockType", () => {
    let setHeading = setBlockType2(schema2.nodes.heading, { level: 1 });
    let setPara = setBlockType2(schema2.nodes.paragraph);
    let setCode = setBlockType2(schema2.nodes.code_block);
    it("can change the type of a paragraph", () => apply(doc(p("fo<a>o")), setHeading, doc(h1("foo"))));
    it("can change the type of a code block", () => apply(doc(pre("fo<a>o")), setHeading, doc(h1("foo"))));
    it("can make a heading into a paragraph", () => apply(doc(h1("fo<a>o")), setPara, doc(p("foo"))));
    it("preserves marks", () => apply(doc(h1("fo<a>o", em("bar"))), setPara, doc(p("foo", em("bar")))));
    it("acts on node selections", () => apply(doc("<a>", h1("foo")), setPara, doc(p("foo"))));
    it("can make a block a code block", () => apply(doc(h1("fo<a>o")), setCode, doc(pre("foo"))));
    it("clears marks when necessary", () => apply(doc(p("fo<a>o", em("bar"))), setCode, doc(pre("foobar"))));
    it("acts on multiple blocks when possible", () => apply(doc(p("a<a>bc"), p("def"), ul(li(p("ghi"), p("jk<b>l")))), setCode, doc(pre("a<a>bc"), pre("def"), ul(li(p("ghi"), pre("jk<b>l"))))));
    it("returns false when all textblocks in the selection are already this type", () => apply(doc(pre("a<a>bc"), pre("de<b>f")), setCode, null));
    it("returns false when the selected blocks can't be changed", () => apply(doc(ul(p("a<a>b<b>c"), p("def"))), setCode, null));
  });
  describe("selectParentNode", () => {
    it("selects the whole textblock", () => apply(doc(ul(li(p("foo"), p("b<a>ar")), li(p("baz")))), selectParentNode, doc(ul(li(p("foo"), "<a>", p("bar")), li(p("baz"))))));
    it("goes one level up when on a block", () => apply(doc(ul(li(p("foo"), "<a>", p("bar")), li(p("baz")))), selectParentNode, doc(ul("<a>", li(p("foo"), p("bar")), li(p("baz"))))));
    it("goes further up", () => apply(doc(ul("<a>", li(p("foo"), p("bar")), li(p("baz")))), selectParentNode, doc("<a>", ul(li(p("foo"), p("bar")), li(p("baz"))))));
    it("stops at the top level", () => apply(doc("<a>", ul(li(p("foo"), p("bar")), li(p("baz")))), selectParentNode, doc("<a>", ul(li(p("foo"), p("bar")), li(p("baz"))))));
  });
  describe("autoJoin", () => {
    it("joins lists when deleting a paragraph between them", () => apply(doc(ul(li(p("a"))), "<a>", p("b"), ul(li(p("c")))), autoJoin(deleteSelection, ["bullet_list"]), doc(ul(li(p("a")), li(p("c"))))));
    it("doesn't join lists when deleting an item inside of them", () => apply(doc(ul(li(p("a")), "<a>", li(p("b"))), ul(li(p("c")))), autoJoin(deleteSelection, ["bullet_list"]), doc(ul(li(p("a"))), ul(li(p("c"))))));
    it("joins lists when wrapping a paragraph after them in a list", () => apply(doc(ul(li(p("a"))), p("b<a>")), autoJoin(wrapIn(schema2.nodes.bullet_list), ["bullet_list"]), doc(ul(li(p("a")), li(p("b"))))));
    it("joins lists when wrapping a paragraph between them in a list", () => apply(doc(ul(li(p("a"))), p("b<a>"), ul(li(p("c")))), autoJoin(wrapIn(schema2.nodes.bullet_list), ["bullet_list"]), doc(ul(li(p("a")), li(p("b")), li(p("c"))))));
    it("joins lists when lifting a list between them", () => apply(doc(ul(li(p("a"))), blockquote("<a>", ul(li(p("b")))), ul(li(p("c")))), autoJoin(lift2, ["bullet_list"]), doc(ul(li(p("a")), li(p("b")), li(p("c"))))));
  });
  describe("toggleMark", () => {
    let toggleEm = toggleMark(schema2.marks.em), toggleStrong = toggleMark(schema2.marks.strong);
    let toggleEm2 = toggleMark(schema2.marks.em, null, { removeWhenPresent: false });
    it("can add a mark", () => {
      apply(doc(p("one <a>two<b>")), toggleEm, doc(p("one ", em("two"))));
    });
    it("can stack marks", () => {
      apply(doc(p("one <a>tw", strong("o<b>"))), toggleEm, doc(p("one ", em("tw", strong("o")))));
    });
    it("can remove marks", () => {
      apply(doc(p(em("one <a>two<b>"))), toggleEm, doc(p(em("one "), "two")));
    });
    it("can toggle pending marks", () => {
      let state = mkState(doc(p("hell<a>o")));
      toggleEm(state, (tr) => state = state.apply(tr));
      ist_default(state.storedMarks.length, 1);
      toggleStrong(state, (tr) => state = state.apply(tr));
      ist_default(state.storedMarks.length, 2);
      toggleEm(state, (tr) => state = state.apply(tr));
      ist_default(state.storedMarks.length, 1);
    });
    it("skips whitespace at selection ends when adding marks", () => {
      apply(doc(p("one<a> two  <b>three")), toggleEm, doc(p("one ", em("two"), "  three")));
    });
    it("doesn't skip whitespace-only selections", () => {
      apply(doc(p("one<a> <b>two")), toggleEm, doc(p("one", em(" "), "two")));
    });
    it("includes whitespace when asked", () => {
      apply(doc(p("one<a> two  <b>three")), toggleMark(schema2.marks.em, null, { includeWhitespace: true }), doc(p("one", em(" two  "), "three")));
    });
    it("can add marks with remove-when-present off", () => {
      apply(doc(p("<a>", em("one"), " two<b>")), toggleEm2, doc(p(em("one two"))));
      apply(doc(p("<a>three<b>")), toggleEm2, doc(p(em("three"))));
    });
    it("can remove marks with remove-when-present off", () => {
      apply(doc(p(em("o<a>ne two<b>"))), toggleEm2, doc(p(em("o"), "ne two")));
    });
    it("can remove marks with trailing space when remove-when-present is off", () => {
      apply(doc(p(em("o<a>ne two"), "  <b>three")), toggleEm2, doc(p(em("o"), "ne two  three")));
    });
    function footnoteSchema() {
      let schema3 = new Schema({
        nodes: {
          text: { inline: true },
          doc: { content: "para+" },
          footnote: { content: "text*", atom: true, inline: true },
          para: { content: "(text | footnote)*" }
        },
        marks: {
          em: {}
        }
      });
      return builders(schema3);
    }
    it("enters inline atoms by default", () => {
      let { doc: doc2, para, footnote, em: em2, schema: schema3 } = footnoteSchema();
      apply(doc2(para("h<a>ello", footnote("okay"), "<b>")), toggleMark(schema3.marks.em), doc2(para("h", em2("ello", footnote(em2("okay"))))));
    });
    it("doesn't enter inline atoms to add a mark when told not to", () => {
      let { doc: doc2, para, footnote, em: em2, schema: schema3 } = footnoteSchema();
      apply(doc2(para("h<a>ello", footnote("okay"), "<b>")), toggleMark(schema3.marks.em, null, { enterInlineAtoms: false }), doc2(para("h", em2("ello", footnote("okay")))));
    });
    it("can apply styles inside inline atoms", () => {
      let { doc: doc2, para, footnote, em: em2, schema: schema3 } = footnoteSchema();
      apply(doc2(para("hello", footnote("o<a>kay<b>"))), toggleMark(schema3.marks.em, null, { enterInlineAtoms: false }), doc2(para("hello", footnote("o", em2("kay")))));
    });
    it("can add a mark even if already active inside an inline atom", () => {
      let { doc: doc2, para, footnote, em: em2, schema: schema3 } = footnoteSchema();
      apply(doc2(para("h<a>ello", footnote(em2("okay")), "<b>")), toggleMark(schema3.marks.em, null, { enterInlineAtoms: false }), doc2(para("h", em2("ello", footnote(em2("okay"))))));
    });
    it("doesn't enter inline atoms to remove a mark when told not to", () => {
      let { doc: doc2, para, footnote, em: em2, schema: schema3 } = footnoteSchema();
      apply(doc2(para(em2("h<a>ello", footnote(em2("okay")), "<b>"))), toggleMark(schema3.marks.em, null, { enterInlineAtoms: false }), doc2(para(em2("h"), "ello", footnote(em2("okay")))));
    });
  });
  describe("selectTextblockStart and selectTextblockEnd", () => {
    it("can move the cursor when the selection is empty", () => {
      apply(doc(p("one <a>two")), selectTextblockStart, doc(p("<a>one two")));
      apply(doc(p("one <a>two")), selectTextblockEnd, doc(p("one two<a>")));
    });
    it("can move the cursor when the selection is not empty", () => {
      apply(doc(p("one <a>two<b>")), selectTextblockStart, doc(p("<a>one two")));
      apply(doc(p("one <a>two<b>")), selectTextblockEnd, doc(p("one two<a>")));
    });
    it("can move the cursor when the selection crosses multiple text blocks", () => {
      apply(doc(p("one <a>two"), p("three<b> four")), selectTextblockStart, doc(p("<a>one two"), p("three four")));
      apply(doc(p("one <a>two"), p("three<b> four")), selectTextblockEnd, doc(p("one two"), p("three four<a>")));
    });
  });
  globalThis.evameReferenceResults = JSON.stringify(evameResults);
})();
