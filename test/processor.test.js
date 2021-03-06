const assert = require('chai').assert;
const EvergreenProcessor = require('../src/EvergreenProcessor');

describe('Evergreen Processor', function () {
  describe('headers processed', function () {
    it('should convert lines starting with up to 6 #', function () {
      const processor = new EvergreenProcessor();
      for (var i = 1; i < 8; i++) {
        const header = '#'.repeat(i) + ' Hello';
        const element = `h${i > 6 ? 6 : i}`
        processor.updateLines([header])
        const elements = processor.parse();
        const parsedHeader = elements[0];
        assert.equal(parsedHeader.element, element);
        assert.equal(parsedHeader.text, 'Hello');
      }
    });

    it('should parse id and classes in header', function () {
      const header = '## Hello! {#id .c1 .c2}';
      const processor = new EvergreenProcessor([header]);
      const elements = processor.parse();
      const parsedHeader = elements[0];
      assert.equal(parsedHeader.element, 'h2');
      assert.equal(parsedHeader.text, 'Hello!');
      assert.equal(parsedHeader.id, 'id');
      assert.equal(parsedHeader.classes.length, 2);
      assert.equal(parsedHeader.classes[0], 'c1');
      assert.equal(parsedHeader.classes[1], 'c2');
    });
  });

  describe('paragraph processed', function() {
    it('should parse text as paragraph', function () {
      const paragraph = 'Hello, World! {#id .c1}';
      const processor = new EvergreenProcessor([paragraph]);
      const elements = processor.parse();
      const parsedParagraph = elements[0];
      assert.equal(parsedParagraph.element, 'p');
      assert.equal(parsedParagraph.text, 'Hello, World!');
      assert.equal(parsedParagraph.id, 'id');
      assert.equal(parsedParagraph.classes.length, 1);
      assert.equal(parsedParagraph.classes[0], 'c1');
    });

    it('should be able to parse links inside paragraph', function () {
      const paragraph = 'A paragraph [that](title two links) has at least [two](reffin) links. {#id .c1 .c2 .c3}';
      const processor = new EvergreenProcessor([paragraph]);
      const elements = processor.parse();
      const parsedParagraph = elements[0];
      assert.equal(parsedParagraph.element, 'p');
      assert.equal(parsedParagraph.children.length, 2);
      const id1 = parsedParagraph.children[0].identifier;
      const id2 = parsedParagraph.children[1].identifier;
      assert.equal(parsedParagraph.text, `A paragraph ${id1} has at least ${id2} links.`);
      assert.equal(parsedParagraph.children[0].dest, 'title');
      assert.equal(parsedParagraph.children[0].text, 'that');
      assert.equal(parsedParagraph.children[0].title, 'two links');
      assert.equal(parsedParagraph.children[1].dest, 'reffin');
      assert.equal(parsedParagraph.children[1].text, 'two');
      assert.equal(parsedParagraph.children[1].title, '');
      assert.equal(parsedParagraph.id, 'id');
      assert.equal(parsedParagraph.classes.length, 3);
      assert.equal(parsedParagraph.classes[0], 'c1');
    });
  });

  describe('list processed', function () {
    it('should be able to parse a list for ordered items', function () {
      const line1 = '1. Hello';
      const line2 = '2. To The';
      const line3 = '3. World';
      const processor = new EvergreenProcessor([line1, line2, line3]);
      const elements = processor.parse();
      const list = elements[0];
      assert.equal(list.element, 'ol');
      assert.equal(list.children.length, 3);
    });

    it('should be able to parse a list for unordered items', function () {
      const line1 = '* Hello';
      const line2 = '- To The';
      const line3 = '+ World';
      const processor = new EvergreenProcessor([line1, line2, line3]);
      const elements = processor.parse();
      const list = elements[0];
      assert.equal(list.element, 'ul');
      assert.equal(list.children.length, 3);
    });

    it('should be able to parse a sub list', function () {
      const line1 = '1. Hello';
      const line2 = '2. To The';
      const line3 = '  * End of';
      const line4 = '  + the world';
      const line5 = '  - as we know it';
      const line6 = '3. World';
      const processor = new EvergreenProcessor([line1, line2, line3, line4, line5, line6]);
      const elements = processor.parse();
      const list = elements[0];
      assert.equal(list.element, 'ol');
      assert.equal(list.children.length, 3);
      const subListParent = list.children[1];
      assert.equal(subListParent.element, 'li');
      assert.equal(subListParent.children.length, 1);
      const subList = subListParent.children[0];
      assert.equal(subList.element, 'ul');
      assert.equal(subList.children.length, 3);
    });

    it('should set identifiers for the list', function () {
      const line1 = '1. Hello {#subID .subClass} {{#id .class}}';
      const line2 = '2. World {{#no .class}}';
      const processor = new EvergreenProcessor([line1, line2]);
      const elements = processor.parse();
      const list = elements[0];
      assert.equal(list.element, 'ol');
      assert.equal(list.children.length, 2);
      assert.equal(list.id, 'id');
      assert.equal(list.classes.length, 1);
      assert.equal(list.classes[0], 'class');
      const line1Element = list.children[0];
      const line2Element = list.children[1];
      assert.equal(line1Element.id, 'subID');
      assert.equal(line1Element.classes.length, 1);
      assert.equal(line1Element.classes[0], 'subClass');
      assert.equal(line1Element.text, 'Hello');
      assert.equal(line2Element.text, 'World {{#no .class}}');
    });

    it('should set the identifiers for a sub list', function () {
      const line1 = '1. Hello {#subID .subClass} {{#id .class}}';
      const line2 = '2. World {{#no .class}}';
      const line3 = '  * Goodnight Moon {#subs .sub} {{#id .class}}';
      const processor = new EvergreenProcessor([line1, line2, line3]);
      const elements = processor.parse();
      const list = elements[0];
      const line2Element = list.children[1];
      assert.equal(line2Element.children.length, 1);
      const subList = line2Element.children[0];
      assert.equal(subList.id, 'id');
      assert.equal(subList.classes.length, 1);
      assert.equal(subList.classes[0], 'class');
      assert.equal(subList.children.length, 1);
      const subListItem = subList.children[0];
      assert.equal(subListItem.id, 'subs');
      assert.equal(subListItem.classes.length, 1);
      assert.equal(subListItem.classes[0], 'sub');
    });

    it('should be able to go back to parent lists from sub lists', function () {
      const line1 = '1. Hello';
      const line2 = '2. There';
      const sub1 = '  1. Sub';
      const subSub1 = '    1. List';
      const sub3 = '  3. Of subs';
      const subSub2 = '    - Unorderd';
      const line3 = '3. Done';
      const processor = new EvergreenProcessor([line1, line2, sub1, subSub1, sub3, subSub2, line3]);
      const elements = processor.parse();

      const list = elements[0];
      assert.equal(list.children.length, 3);
      assert.equal(list.children[1].children.length, 1);

      const subList = list.children[1].children[0];
      assert.equal(subList.children.length, 2);
    });
  });

  describe('list item processed', function () {
    it('should return a list item from ordered list', function () {
      const listItem = '1. Ordered { .c2 #id }';
      const processor = new EvergreenProcessor();

      const listItemElement = processor.parseListItem(listItem);
      assert.equal(listItemElement.element, 'li');
      assert.equal(listItemElement.text, 'Ordered');
      assert.equal(listItemElement.id, 'id');
      assert.equal(listItemElement.classes.length, 1);
      assert.equal(listItemElement.classes[0], 'c2');
    });

    it('should return a list item from all unorderd list types', function () {
      const starListItem = '* Disorder { .c2 #id }';
      const dashListItem = '- Disorder { .c2 #id }';
      const plusListItem = '+ Disorder { .c2 #id }';
      const processor = new EvergreenProcessor();
      [starListItem, dashListItem, plusListItem].forEach(function (listItem) {
        const listItemElement = processor.parseListItem(listItem);
        assert.equal(listItemElement.element, 'li');
        assert.equal(listItemElement.text, 'Disorder');
        assert.equal(listItemElement.id, 'id');
        assert.equal(listItemElement.classes.length, 1);
        assert.equal(listItemElement.classes[0], 'c2');
      });
    });

    it('should be able to parse links in list items', function () {
      const itemWithLinks = '1. [A link](to the past) {#id .class}';
      const processor = new EvergreenProcessor();
      const listItemElement = processor.parseListItem(itemWithLinks);
      assert.equal(listItemElement.element, 'li');
      assert.equal(listItemElement.id, 'id');
      assert.equal(listItemElement.classes.length, 1);
      assert.equal(listItemElement.classes[0], 'class');
      assert.equal(listItemElement.children.length, 1);
      assert.equal(listItemElement.children[0].dest, 'to');
      assert.equal(listItemElement.children[0].text, 'A link');
      assert.equal(listItemElement.children[0].title, 'the past');
      const id = listItemElement.children[0].identifier;
      assert.equal(listItemElement.text, `${id}`);
    });

    it('should be able to process an image from a list item', function () {
      const itemWithImage = '1. ![An image](to the past) {#id .class}';
      const processor = new EvergreenProcessor();
      const listItemElement = processor.parseListItem(itemWithImage);
      assert.equal(listItemElement.element, 'li');
      assert.equal(listItemElement.id, 'id');
      assert.equal(listItemElement.classes.length, 1);
      assert.equal(listItemElement.classes[0], 'class');
      assert.equal(listItemElement.children.length, 1);
      assert.equal(listItemElement.children[0].dest, 'to');
      assert.equal(listItemElement.children[0].text, 'An image');
      assert.equal(listItemElement.children[0].title, 'the past');
      const id = listItemElement.children[0].identifier;
      assert.equal(listItemElement.text, `${id}`);
    });
  });

  describe('blockquote processed', function () {
    it('should parse a blockquote', function () {
      const blockquote = '> Quote me'
      const processor = new EvergreenProcessor([blockquote]);
      const elements = processor.parse();
      const blockquoteElement = elements[0];

      assert.equal(blockquoteElement.element, 'blockquote');
      assert.equal(blockquoteElement.children.length, 1);
      assert.equal(blockquoteElement.children[0].element, 'p');
      assert.equal(blockquoteElement.children[0].text, 'Quote me');
    });

    it('should parse a sub blockquote', function () {
      const blockquote = '> Quoting items';
      const subQuote = '>> Quoting items sub';
      const processor = new EvergreenProcessor([blockquote, subQuote]);
      const elements = processor.parse();
      const blockquoteElement = elements[0];

      assert.equal(blockquoteElement.element, 'blockquote');
      assert.equal(blockquoteElement.children.length, 2);
      assert.equal(blockquoteElement.children[0].element, 'p');
      assert.equal(blockquoteElement.children[0].text, 'Quoting items');
    });

    it('should be able to properly get identifiers for blockquote', function () {
      const blockquote = '> Quote me {#subID .subClass} {{#id .class}} '
      const processor = new EvergreenProcessor([blockquote]);
      const elements = processor.parse();
      const blockquoteElement = elements[0];

      assert.equal(blockquoteElement.element, 'blockquote');
      assert.equal(blockquoteElement.id, 'id');
      assert.equal(blockquoteElement.classes.length, 1);
      assert.equal(blockquoteElement.classes[0], 'class');
      assert.equal(blockquoteElement.children.length, 1);
      assert.equal(blockquoteElement.children[0].id, 'subID');
      assert.equal(blockquoteElement.children[0].classes.length, 1);
      assert.equal(blockquoteElement.children[0].classes[0], 'subClass');
    });

    it('should be able to properly get identifiers for sub blockquote', function () {
      const blockquote = '> Quote me {#subID .subClass} {{#id .class}}'
      const subQuote = '>> Sub me {#subbed .subClass} {{#sub .sub}}'
      const processor = new EvergreenProcessor([blockquote, subQuote]);
      const elements = processor.parse();
      const blockquoteElement = elements[0];

      assert.equal(blockquoteElement.element, 'blockquote');
      assert.equal(blockquoteElement.id, 'id');
      assert.equal(blockquoteElement.classes.length, 1);
      assert.equal(blockquoteElement.classes[0], 'class');
      assert.equal(blockquoteElement.children.length, 2);

      let subBlockquoteElement = blockquoteElement.children[1];

      assert.equal(subBlockquoteElement.id, 'sub');
      assert.equal(subBlockquoteElement.classes.length, 1);
      assert.equal(subBlockquoteElement.classes[0], 'sub');
      assert.equal(subBlockquoteElement.children.length, 1);
      assert.equal(subBlockquoteElement.children[0].id, 'subbed');
      assert.equal(subBlockquoteElement.children[0].classes.length, 1);
      assert.equal(subBlockquoteElement.children[0].classes[0], 'subClass');
    });

    it('should be able to append to the same paragraph between lines', function () {
      const quote1 = '> Quote 1';
      const quote2 = '> Quote 2';
      const quote3 = '> Quote 3';
      const processor = new EvergreenProcessor([quote1, quote2, quote3]);
      const elements = processor.parse();

      assert.equal(elements.length, 1);

      const blockquote = elements[0];
      assert.equal(blockquote.children.length, 1);
      assert.equal(blockquote.children[0].text, 'Quote 1 Quote 2 Quote 3');
    });

    it('should be able to add multiple paragraphs to the blockquote', function () {
      const quote1 = '> Quote 1';
      const split = '>';
      const quote2 = '> Second quote';
      const processor = new EvergreenProcessor([quote1, split, quote2]);
      const elements = processor.parse();

      assert.equal(elements.length, 1);

      const blockquote = elements[0];
      assert.equal(blockquote.children.length, 2);
      assert.equal(blockquote.children[0].text, 'Quote 1');
      assert.equal(blockquote.children[1].text, 'Second quote');
    });

    it('should be able to go back to parent quotes from sub quotes', function () {
      const quote1 = '> Quote 1';
      const subQuote1 = '>> Sub quote';
      const subSubQuote1 = '>>>>>> Sub sub quote'
      const quote2 = '> Quote 1';
      const processor = new EvergreenProcessor([quote1, subQuote1, subSubQuote1, quote2]);
      const elements = processor.parse();

      assert.equal(elements.length, 1);

      const blockquote = elements[0];

      assert.equal(blockquote.children.length, 3);
    });
  });

  describe('div processed', function () {
    it('should be able to parse div elements', function () {
      const div = '<<-DIV{#id .class}';
      const paragraph = 'A paragraph, of course';
      const close = '<<-DIV';

      const processor = new EvergreenProcessor([div, paragraph, close]);

      const elements = processor.parse();

      assert.equal(elements.length, 1);

      const divElement = elements[0];
      assert.equal(divElement.id, 'id');
      assert.equal(divElement.classes.length, 1);
      assert.equal(divElement.classes[0], 'class');
      assert.equal(divElement.children.length, 1);
    });

    it('should be able to parse sub div elements', function () {
      const div = '<<-DIV{#id .class}';
      const paragraph = 'A paragraph, of course';
      const subDiv = '<<-TWO{#sub .subbed}';
      const subParagraph = 'Of course, of course';
      const subClose = '<<-TWO';
      const close = '<<-DIV';

      const processor = new EvergreenProcessor([div, paragraph, subDiv, subParagraph, subClose, close]);

      const elements = processor.parse();

      assert.equal(elements.length, 1);

      const divElement = elements[0];

      assert.equal(divElement.id, 'id');
      assert.equal(divElement.classes.length, 1);
      assert.equal(divElement.classes[0], 'class');
      assert.equal(divElement.children.length, 2);

      const subDivElement = divElement.children[1];
      assert.equal(subDivElement.id, 'sub');
      assert.equal(subDivElement.classes.length, 1);
      assert.equal(subDivElement.classes[0], 'subbed');
      assert.equal(subDivElement.children.length, 1);
    });
  });

  describe('image processed', function () {
    it('should be able to process an image', function () {
      const image = '![coyote](wild was a movie)';
      const processor = new EvergreenProcessor([image]);
      const elements = processor.parse();

      const imageElement = elements[0];

      assert.equal(imageElement.element, 'img');
      assert.equal(imageElement.dest, 'wild');
      assert.equal(imageElement.text, 'coyote');
      assert.equal(imageElement.title, 'was a movie');
    });

    it('should be able to process an image link', function () {
      // const imageLink = '[![coyote](wild was a movie)](check the imdb page)';
      // const processor = new EvergreenProcessor([imageLink]);
      // const elements = processor.parse();
      //
      // const imageLinkElement = elements[0];
      // // TODO: Allow image links
    });

    it('should be able to process an inline image', function () {
      const imageText = 'A wild ![coyote](wild was a move) and then some';
      const processor = new EvergreenProcessor([imageText]);
      const elements = processor.parse();

      const textElement = elements[0];
      assert.equal(textElement.children.length, 1);
      const imageElement = textElement.children[0];
      assert.equal(textElement.text, `A wild ${imageElement.identifier} and then some`);
      assert.equal(imageElement.element, 'img');
    });
  });

  describe('horizontal rule processed', function () {
    it('should be able to process a horizontal rule', function () {
      const ruler = '---';
      const processor = new EvergreenProcessor([ruler]);
      const elements = processor.parse();

      const rulerElement = elements[0];

      assert.equal(rulerElement.element, 'hr');
    });
  });

  describe('break processed', function () {
    it('should be able to add a break after a paragraph', function () {
      const paragraph = 'Let us trail some data {#id .class}  ';
      const processor = new EvergreenProcessor([paragraph]);
      const elements = processor.parse();

      assert.equal(elements.length, 2);

      const paragraphElement = elements[0];
      assert.equal(paragraphElement.id, 'id');
      assert.equal(paragraphElement.classes.length, 1);
      assert.equal(paragraphElement.classes[0], 'class');
      assert.equal(elements[1].element, 'br');
    });
  });

  describe('table processed', function () {
    it('should be able to parse a table', function () {
      const row1 = '|Hello|to the|world|';
      const row2 = '|-----|------|-----|';
      const row3 = '|we are|getting|data|';
      const processor = new EvergreenProcessor([row1, row2, row3]);
      const elements = processor.parse();

      assert.equal(elements.length, 1);

      const tableElement = elements[0];
      assert.equal(tableElement.element, 'table');
      assert.equal(tableElement.children.length, 2);

      const tableHeader = tableElement.children[0];


    });

    it('should be able to handle alignments in the table header', function () {
      const row1 = '|Hello|to the|world|';
      const row2 = '|:-----|:------:|-----:|';
      const processor = new EvergreenProcessor([row1, row2]);
      const elements = processor.parse();

      const tableElement = elements[0];
      const headerRow = tableElement.children[0];

      ['left', 'center', 'right'].forEach(function (alignment, idx) {
        assert.equal(headerRow.children[idx].alignment, alignment);
      });

    });

    it('should be able to handle table and row identifiers', function () {
      const row1 = '|Hello|Table|{#id .class} {{#parent .carent}}';
      const row2 = '|Data|Stuff|{#did .dass}';
      const processor = new EvergreenProcessor([row1, row2]);
      const elements = processor.parse();

      const tableElement = elements[0];

      assert.equal(tableElement.id, 'parent');
      assert.equal(tableElement.classes.length, 1);
      assert.equal(tableElement.classes[0], 'carent');
      assert.equal(tableElement.children.length, 2);

      const firstRow = tableElement.children[0];

      assert.equal(firstRow.id, 'id');
      assert.equal(firstRow.classes.length, 1);
      assert.equal(firstRow.classes[0], 'class');

      const secondRow = tableElement.children[1];

      assert.equal(secondRow.id, 'did');
      assert.equal(secondRow.classes.length, 1);
      assert.equal(secondRow.classes[0], 'dass');
    });

    it('should be able to handle mismatched row count', function () {
      const row1 = '|Hello|to the|';
      const row2 = '|---|----|---|';
      const row3 = '|a|data row|for|all|';
      const processor = new EvergreenProcessor([row1, row2]);
      let elements = processor.parse();

      let tableElement = elements[0];

      assert.equal(tableElement.numColumns, 3);
      processor.updateLines([row1, row2, row3]);
      elements = processor.parse();
      tableElement = elements[0];
      assert.equal(tableElement.numColumns, 4)
    });
  });

  describe('identifier processed', function () {
    it('should return a list of classes and ids', function () {
      const processor = new EvergreenProcessor();
      const header = '## Hello! {#id .c1 .c2}'
      const { line, id, classes } = processor.splitIdentifiersFromLine(header);
      assert.equal(line, '## Hello!');
      assert.equal(id, 'id');
      assert.equal(classes.length, 2);
      assert.equal(classes[0], 'c1');
      assert.equal(classes[1], 'c2');
    });

    it('should only return classes if there is no id', function () {
      const processor = new EvergreenProcessor();
      const header = '## Hello! {.c1 .c2}'
      const { line, id, classes } = processor.splitIdentifiersFromLine(header);
      assert.equal(line, '## Hello!');
      assert.equal(id, undefined);
      assert.equal(classes.length, 2);
      assert.equal(classes[0], 'c1');
      assert.equal(classes[1], 'c2');
    });

    it('should only return an id and an empty array if there are no classes', function () {
      const processor = new EvergreenProcessor();
      const header = '## Hello! {#id}'
      const { line, id, classes } = processor.splitIdentifiersFromLine(header);
      assert.equal(line, '## Hello!');
      assert.equal(id, 'id');
      assert.equal(classes.length, 0);
    })
  });

  describe('links processed', function () {
    it('should be able to split links from text', function () {
      const processor = new EvergreenProcessor();
      const inputText = 'A paragraph [that](title two links) has at least [two](reffin) links. {#id .c1 .c2 .c3}';
      const el = { children: [] }
      const { _, text } = processor.parseChildText(el, inputText);

      assert.equal(el.children.length, 2);
      const id1 = el.children[0].identifier;
      const id2 = el.children[1].identifier;

      assert.equal(text, `A paragraph ${id1} has at least ${id2} links. {#id .c1 .c2 .c3}`);
      assert.equal(el.children[0].dest, 'title');
      assert.equal(el.children[0].text, 'that');
      assert.equal(el.children[0].title, 'two links');
      assert.equal(el.children[1].dest, 'reffin');
      assert.equal(el.children[1].text, 'two');
      assert.equal(el.children[1].title, '');
    });
  });

  describe('reset elements processed', function () {
    it('should be able to reset elements if there is blank space', function () {
      const line1 = 'Hello world';
      const spacer = '';
      const line2 = 'Hello again';
      const processor = new EvergreenProcessor([line1, spacer, line2]);
      const elements = processor.parse();
      assert.equal(elements.length, 2);
    })
  });

  describe('modifiers processed', function () {
    it('should parse modifiers in paragraphs', function () {
      const line = 'Hello **users** welcome. We ***make*** some *things* I guess';
      const processor = new EvergreenProcessor([line]);
      const elements = processor.parse();
      assert.equal(elements.length, 1);
      const p = elements[0];
      assert.equal(p.children.length, 3);
      const bold = p.children[1];
      const both = p.children[0];
      const italic = p.children[2];
      assert.equal(bold.element, 'b');
      assert.equal(both.element, 'b');
      assert.equal(both.children.length, 1);
      assert.equal(both.children[0].element, 'i');
      assert.equal(italic.element, 'i');
      assert.equal(p.text, `Hello ${bold.identifier} welcome. We ${both.identifier} some ${italic.identifier} I guess`);
    })
  });

  describe('code processed', function () {
    it('should be able to handle code elements', function () {
      const lines = [
        '```',
        'function hello() {',
        '  return "Hello World";',
        '',
        '}',
        '```'
      ];
      const processor = new EvergreenProcessor(lines);
      const elements = processor.parse();
      assert.equal(elements.length, 1);
      const pre = elements[0];
      assert.equal(pre.element, 'pre');
      assert.equal(pre.children.length, 1);
      const code = pre.children[0];
      assert.equal(code.element, 'code');
      assert.equal(code.text, 'function hello() {\n  return "Hello World";\n\n}');
    });

    it('should be able to escape html characters', function () {
      const lines = [
        '```',
        '<!DOCTYPE html>',
        '<html>',
        '  <head>',
        '    <link rel="stylesheet" type="text/css" />',
        '  </head>',
        '  <body>',
        '',
        '    <h1>Hello World</h1>',
        '  </body>',
        '</html>',
        '```'
      ];
      const processor = new EvergreenProcessor(lines);
      const elements = processor.parse();
      assert.equal(elements.length, 1);
      const pre = elements[0];
      assert.equal(pre.element, 'pre');
      assert.equal(pre.children.length, 1);
      const code = pre.children[0];
      assert.equal(code.element, 'code');
      assert.equal(code.text, '&lt;!DOCTYPE html&gt;\n&lt;html&gt;\n  &lt;head&gt;\n    &lt;link rel="stylesheet" type="text/css" /&gt;\n  &lt;/head&gt;\n  &lt;body&gt;\n\n    &lt;h1&gt;Hello World&lt;/h1&gt;\n  &lt;/body&gt;\n&lt;/html&gt;');
    });
  });
});
