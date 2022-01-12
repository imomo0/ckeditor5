/**
 * @license Copyright (c) 2003-2021, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import DocumentListEditing from '../../src/documentlist/documentlistediting';

import BoldEditing from '@ckeditor/ckeditor5-basic-styles/src/bold/boldediting';
import UndoEditing from '@ckeditor/ckeditor5-undo/src/undoediting';
import ClipboardPipeline from '@ckeditor/ckeditor5-clipboard/src/clipboardpipeline';
import BlockQuoteEditing from '@ckeditor/ckeditor5-block-quote/src/blockquoteediting';
import HeadingEditing from '@ckeditor/ckeditor5-heading/src/headingediting';
import TableEditing from '@ckeditor/ckeditor5-table/src/tableediting';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import testUtils from '@ckeditor/ckeditor5-core/tests/_utils/utils';
import EventInfo from '@ckeditor/ckeditor5-utils/src/eventinfo';

import VirtualTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor';
import { getData as getModelData, parse as parseModel, setData as setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import { parse as parseView } from '@ckeditor/ckeditor5-engine/src/dev-utils/view';
import { DomEventData } from '@ckeditor/ckeditor5-engine';

import stubUid from './_utils/uid';
import { modelList } from './_utils/utils';

describe( 'DocumentListEditing integrations', () => {
	let editor, model, modelDoc, modelRoot, view;

	testUtils.createSinonSandbox();

	beforeEach( async () => {
		editor = await VirtualTestEditor.create( {
			plugins: [ Paragraph, ClipboardPipeline, BoldEditing, DocumentListEditing, UndoEditing,
				BlockQuoteEditing, TableEditing, HeadingEditing ]
		} );

		model = editor.model;
		modelDoc = model.document;
		modelRoot = modelDoc.getRoot();

		view = editor.editing.view;

		model.schema.extend( 'paragraph', {
			allowAttributes: 'foo'
		} );

		model.schema.register( 'nonListable', {
			allowWhere: '$block',
			allowContentOf: '$block',
			inheritTypesFrom: '$block',
			allowAttributes: 'foo'
		} );

		editor.conversion.elementToElement( { model: 'nonListable', view: 'div' } );

		// Stub `view.scrollToTheSelection` as it will fail on VirtualTestEditor without DOM.
		sinon.stub( view, 'scrollToTheSelection' ).callsFake( () => {} );
		stubUid();
	} );

	afterEach( async () => {
		await editor.destroy();
	} );

	describe( 'clipboard integration', () => {
		describe( 'copy and getSelectedContent', () => {
			it( 'should be able to downcast part of a nested list', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A</paragraph>' +
					'[<paragraph listType="bulleted" listItemId="b" listIndent="1">B1</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B2</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C1</paragraph>]' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C2</paragraph>'
				);

				const modelFragment = model.getSelectedContent( model.document.selection );
				const viewFragment = editor.data.toView( modelFragment );
				const data = editor.data.htmlProcessor.toData( viewFragment );

				expect( data ).to.equal(
					'<ul>' +
						'<li>' +
							'<p>B1</p>' +
							'<p>B2</p>' +
							'<ul>' +
								'<li>C1</li>' +
							'</ul>' +
						'</li>' +
					'</ul>'
				);
			} );

			it( 'should be able to downcast part of a deep nested list', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B1</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B2</paragraph>' +
					'[<paragraph listType="bulleted" listItemId="c" listIndent="2">C1</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C2</paragraph>]'
				);

				const modelFragment = model.getSelectedContent( model.document.selection );
				const viewFragment = editor.data.toView( modelFragment );
				const data = editor.data.htmlProcessor.toData( viewFragment );

				expect( data ).to.equal(
					'<ul>' +
						'<li>' +
							'<p>C1</p>' +
							'<p>C2</p>' +
						'</li>' +
					'</ul>'
				);
			} );
		} );

		describe( 'paste and insertContent integration', () => {
			it( 'should be triggered on DataController#insertContent()', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B[]</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C</paragraph>'
				);

				editor.model.insertContent(
					parseModel(
						'<paragraph listType="bulleted" listItemId="x" listIndent="0">X</paragraph>' +
						'<paragraph listType="bulleted" listItemId="y" listIndent="1">Y</paragraph>',
						model.schema
					)
				);

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">A</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">BX</paragraph>' +
					'<paragraph listIndent="2" listItemId="y" listType="bulleted">Y[]</paragraph>' +
					'<paragraph listIndent="2" listItemId="c" listType="bulleted">C</paragraph>'
				);
			} );

			it( 'should be triggered when selectable is passed', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B[]</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C</paragraph>'
				);

				model.insertContent(
					parseModel(
						'<paragraph listType="bulleted" listItemId="x" listIndent="0">X</paragraph>' +
						'<paragraph listType="bulleted" listItemId="y" listIndent="1">Y</paragraph>',
						model.schema
					),
					model.createRange(
						model.createPositionFromPath( modelRoot, [ 1, 1 ] ),
						model.createPositionFromPath( modelRoot, [ 1, 1 ] )
					)
				);

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">A</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">B[]X</paragraph>' +
					'<paragraph listIndent="2" listItemId="y" listType="bulleted">Y</paragraph>' +
					'<paragraph listIndent="2" listItemId="c" listType="bulleted">C</paragraph>'
				);
			} );

			// Just checking that it doesn't crash. #69
			it( 'should work if an element is passed to DataController#insertContent()', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B[]</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C</paragraph>'
				);

				model.change( writer => {
					const paragraph = writer.createElement( 'paragraph', { listType: 'bulleted', listItemId: 'x', listIndent: '0' } );
					writer.insertText( 'X', paragraph );

					model.insertContent( paragraph );
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">A</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">BX[]</paragraph>' +
					'<paragraph listIndent="2" listItemId="c" listType="bulleted">C</paragraph>'
				);
			} );

			// Just checking that it doesn't crash. #69
			it( 'should work if an element is passed to DataController#insertContent() - case #69', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B[]</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C</paragraph>'
				);

				model.change( writer => {
					model.insertContent( writer.createText( 'X' ) );
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">A</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">BX[]</paragraph>' +
					'<paragraph listIndent="2" listItemId="c" listType="bulleted">C</paragraph>'
				);
			} );

			it( 'should fix indents of pasted list items', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B[]</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C</paragraph>'
				);

				const clipboard = editor.plugins.get( 'ClipboardPipeline' );

				clipboard.fire( 'inputTransformation', {
					content: parseView( '<ul><li>X<ul><li>Y</li></ul></li></ul>' )
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">A</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">BX</paragraph>' +
					'<paragraph listIndent="2" listItemId="a00" listType="bulleted">Y[]</paragraph>' +
					'<paragraph listIndent="2" listItemId="c" listType="bulleted">C</paragraph>'
				);
			} );

			it( 'should not fix indents of list items that are separated by non-list element', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B[]</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C</paragraph>'
				);

				const clipboard = editor.plugins.get( 'ClipboardPipeline' );

				clipboard.fire( 'inputTransformation', {
					content: parseView( '<ul><li>W<ul><li>X</li></ul></li></ul><p>Y</p><ul><li>Z</li></ul>' )
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">A</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">BW</paragraph>' +
					'<paragraph listIndent="2" listItemId="a00" listType="bulleted">X</paragraph>' +
					'<paragraph>Y</paragraph>' +
					'<paragraph listIndent="0" listItemId="a02" listType="bulleted">Z[]</paragraph>' +
					'<paragraph listIndent="1" listItemId="c" listType="bulleted">C</paragraph>'
				);
			} );

			it( 'should co-work correctly with post fixer', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B[]</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C</paragraph>'
				);

				const clipboard = editor.plugins.get( 'ClipboardPipeline' );

				clipboard.fire( 'inputTransformation', {
					content: parseView( '<p>X</p><ul><li>Y</li></ul>' )
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">A</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">BX</paragraph>' +
					'<paragraph listIndent="0" listItemId="a00" listType="bulleted">Y[]</paragraph>' +
					'<paragraph listIndent="1" listItemId="c" listType="bulleted">C</paragraph>'
				);
			} );

			it( 'should work if items are pasted between paragraph elements', () => {
				// Wrap all changes in one block to avoid post-fixing the selection
				// (which may be incorret) in the meantime.
				model.change( () => {
					setModelData( model,
						'<paragraph listType="bulleted" listItemId="a" listIndent="0">A</paragraph>' +
						'<paragraph listType="bulleted" listItemId="b" listIndent="1">B</paragraph>[]' +
						'<paragraph listType="bulleted" listItemId="c" listIndent="2">C</paragraph>'
					);

					const clipboard = editor.plugins.get( 'ClipboardPipeline' );

					clipboard.fire( 'inputTransformation', {
						content: parseView( '<ul><li>X<ul><li>Y</li></ul></li></ul>' )
					} );
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">A</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">B</paragraph>' +
					'<paragraph listIndent="1" listItemId="a01" listType="bulleted">X</paragraph>' +
					'<paragraph listIndent="2" listItemId="a00" listType="bulleted">Y[]</paragraph>' +
					'<paragraph listIndent="2" listItemId="c" listType="bulleted">C</paragraph>'
				);
			} );

			it( 'should create correct model when list items are pasted in top-level list', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A[]</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B</paragraph>'
				);

				const clipboard = editor.plugins.get( 'ClipboardPipeline' );

				clipboard.fire( 'inputTransformation', {
					content: parseView( '<ul><li>X<ul><li>Y</li></ul></li></ul>' )
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">AX</paragraph>' +
					'<paragraph listIndent="1" listItemId="a00" listType="bulleted">Y[]</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">B</paragraph>'
				);
			} );

			it( 'should create correct model when list items are pasted in non-list context', () => {
				setModelData( model,
					'<paragraph>A[]</paragraph>' +
					'<paragraph>B</paragraph>'
				);

				const clipboard = editor.plugins.get( 'ClipboardPipeline' );

				clipboard.fire( 'inputTransformation', {
					content: parseView( '<ul><li>X<ul><li>Y</li></ul></li></ul>' )
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph>AX</paragraph>' +
					'<paragraph listIndent="0" listItemId="a00" listType="bulleted">Y[]</paragraph>' +
					'<paragraph>B</paragraph>'
				);
			} );

			it( 'should not crash when "empty content" is inserted', () => {
				setModelData( model, '<paragraph>[]</paragraph>' );

				expect( () => {
					model.change( writer => {
						editor.model.insertContent( writer.createDocumentFragment() );
					} );
				} ).not.to.throw();
			} );

			it( 'should correctly handle item that is pasted without its parent', () => {
				// Wrap all changes in one block to avoid post-fixing the selection
				// (which may be incorret) in the meantime.
				model.change( () => {
					setModelData( model,
						'<paragraph>Foo</paragraph>' +
						'<paragraph listType="numbered" listItemId="a" listIndent="0">A</paragraph>' +
						'<paragraph listType="numbered" listItemId="b" listIndent="1">B</paragraph>' +
						'[]' +
						'<paragraph>Bar</paragraph>'
					);

					const clipboard = editor.plugins.get( 'ClipboardPipeline' );

					clipboard.fire( 'inputTransformation', {
						content: parseView( '<li>X</li>' )
					} );
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph>Foo</paragraph>' +
					'<paragraph listIndent="0" listItemId="a" listType="numbered">A</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="numbered">B</paragraph>' +
					'<paragraph listIndent="1" listItemId="a00" listType="bulleted">X[]</paragraph>' +
					'<paragraph>Bar</paragraph>'
				);
			} );

			it( 'should correctly handle item that is pasted without its parent #2', () => {
				// Wrap all changes in one block to avoid post-fixing the selection
				// (which may be incorret) in the meantime.
				model.change( () => {
					setModelData( model,
						'<paragraph>Foo</paragraph>' +
						'<paragraph listType="numbered" listItemId="a" listIndent="0">A</paragraph>' +
						'<paragraph listType="numbered" listItemId="b" listIndent="1">B</paragraph>' +
						'[]' +
						'<paragraph>Bar</paragraph>'
					);

					const clipboard = editor.plugins.get( 'ClipboardPipeline' );

					clipboard.fire( 'inputTransformation', {
						content: parseView( '<li>X<ul><li>Y</li></ul></li>' )
					} );
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph>Foo</paragraph>' +
					'<paragraph listIndent="0" listItemId="a" listType="numbered">A</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="numbered">B</paragraph>' +
					'<paragraph listIndent="1" listItemId="a01" listType="bulleted">X</paragraph>' +
					'<paragraph listIndent="2" listItemId="a00" listType="bulleted">Y[]</paragraph>' +
					'<paragraph>Bar</paragraph>'
				);
			} );

			it( 'should handle block elements inside pasted list #1', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B[]</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C</paragraph>'
				);

				const clipboard = editor.plugins.get( 'ClipboardPipeline' );

				clipboard.fire( 'inputTransformation', {
					content: parseView( '<ul><li>W<ul><li>X<p>Y</p>Z</li></ul></li></ul>' )
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">A</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">BW</paragraph>' +
					'<paragraph listIndent="2" listItemId="a00" listType="bulleted">X</paragraph>' +
					'<paragraph listIndent="2" listItemId="a00" listType="bulleted">Y</paragraph>' +
					'<paragraph listIndent="2" listItemId="a00" listType="bulleted">Z[]</paragraph>' +
					'<paragraph listIndent="2" listItemId="c" listType="bulleted">C</paragraph>'
				);
			} );

			it( 'should handle block elements inside pasted list #2', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A[]</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C</paragraph>'
				);

				const clipboard = editor.plugins.get( 'ClipboardPipeline' );

				clipboard.fire( 'inputTransformation', {
					content: parseView( '<ul><li>W<ul><li>X<p>Y</p>Z</li></ul></li></ul>' )
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">AW</paragraph>' +
					'<paragraph listIndent="1" listItemId="a00" listType="bulleted">X</paragraph>' +
					'<paragraph listIndent="1" listItemId="a00" listType="bulleted">Y</paragraph>' +
					'<paragraph listIndent="1" listItemId="a00" listType="bulleted">Z[]</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">B</paragraph>' +
					'<paragraph listIndent="2" listItemId="c" listType="bulleted">C</paragraph>'
				);
			} );

			it( 'should handle block elements inside pasted list #3', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A[]</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C</paragraph>'
				);

				const clipboard = editor.plugins.get( 'ClipboardPipeline' );

				clipboard.fire( 'inputTransformation', {
					content: parseView( '<ul><li><p>W</p><p>X</p><p>Y</p></li><li>Z</li></ul>' )
				} );

				expect( getModelData( model ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">AW</paragraph>' +
					'<paragraph listIndent="0" listItemId="a00" listType="bulleted">X</paragraph>' +
					'<paragraph listIndent="0" listItemId="a00" listType="bulleted">Y</paragraph>' +
					'<paragraph listIndent="0" listItemId="a01" listType="bulleted">Z[]</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">B</paragraph>' +
					'<paragraph listIndent="2" listItemId="c" listType="bulleted">C</paragraph>'
				);
			} );

			it( 'should properly handle split of list items with non-standard converters', () => {
				setModelData( model,
					'<paragraph listType="bulleted" listItemId="a" listIndent="0">A[]</paragraph>' +
					'<paragraph listType="bulleted" listItemId="b" listIndent="1">B</paragraph>' +
					'<paragraph listType="bulleted" listItemId="c" listIndent="2">C</paragraph>'
				);

				editor.model.schema.register( 'splitBlock', { allowWhere: '$block' } );

				editor.conversion.for( 'downcast' ).elementToElement( { model: 'splitBlock', view: 'splitBlock' } );
				editor.conversion.for( 'upcast' ).add( dispatcher => dispatcher.on( 'element:splitBlock', ( evt, data, conversionApi ) => {
					const splitBlock = conversionApi.writer.createElement( 'splitBlock' );

					conversionApi.consumable.consume( data.viewItem, { name: true } );
					conversionApi.safeInsert( splitBlock, data.modelCursor );
					conversionApi.updateConversionResult( splitBlock, data );
				} ) );

				const clipboard = editor.plugins.get( 'ClipboardPipeline' );

				clipboard.fire( 'inputTransformation', {
					content: parseView( '<ul><li>a<splitBlock></splitBlock>b</li></ul>' )
				} );

				expect( getModelData( model, { withoutSelection: true } ) ).to.equalMarkup(
					'<paragraph listIndent="0" listItemId="a" listType="bulleted">Aa</paragraph>' +
					'<splitBlock></splitBlock>' +
					'<paragraph listIndent="0" listItemId="a00" listType="bulleted">b</paragraph>' +
					'<paragraph listIndent="1" listItemId="b" listType="bulleted">B</paragraph>' +
					'<paragraph listIndent="2" listItemId="c" listType="bulleted">C</paragraph>'
				);
			} );
		} );
	} );

	describe( 'enter key handling', () => {
		const changedBlocks = [];
		let domEventData, splitCommand, indentCommand, eventInfo, splitCommandExecuteSpy, outdentCommandExecuteSpy;

		beforeEach( () => {
			eventInfo = new EventInfo( view.document, 'enter' );
			domEventData = new DomEventData( view.document, {
				preventDefault: sinon.spy()
			} );

			splitCommand = editor.commands.get( 'splitListItem' );
			indentCommand = editor.commands.get( 'outdentList' );

			splitCommandExecuteSpy = sinon.spy( splitCommand, 'execute' );
			outdentCommandExecuteSpy = sinon.spy( indentCommand, 'execute' );

			changedBlocks.length = 0;

			splitCommand.on( 'afterExecute', ( evt, data ) => {
				changedBlocks.push( ...data );
			} );

			indentCommand.on( 'afterExecute', ( evt, data ) => {
				changedBlocks.push( ...data );
			} );
		} );

		describe( 'collapsed selection', () => {
			describe( 'with just one block per list item', () => {
				it( 'should outdent if the slection in the only empty list item (convert into paragraph and turn off the list)', () => {
					setModelData( model, modelList( [
						'* []'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'[]'
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 0 )
					] );

					sinon.assert.calledOnce( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.true;
				} );

				it( 'should outdent if the slection in the last empty list item (convert the item into paragraph)', () => {
					setModelData( model, modelList( [
						'* a',
						'* []'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'[]'
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 1 )
					] );

					sinon.assert.calledOnce( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.true;
				} );

				it( 'should create another list item when the selection in a non-empty only list item', () => {
					setModelData( model, modelList( [
						'* a[]'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'* [] {id:a00}'
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 1 )
					] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.calledOnce( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should outdent if the selection in an empty, last sub-list item', () => {
					setModelData( model, modelList( [
						'* a',
						'  # b',
						'    * c',
						'    * []'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'  # b',
						'    * c',
						'  # []'
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 3 )
					] );

					sinon.assert.calledOnce( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.true;
				} );
			} );

			describe( 'with multiple blocks in a list item', () => {
				it( 'should outdent if the selection is anchored in an empty, last item block', () => {
					setModelData( model, modelList( [
						'* a',
						'  # b',
						'  # []'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'  # b',
						'* []'
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 2 )
					] );

					sinon.assert.calledOnce( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.true;
				} );

				it( 'should outdent if the selection is anchored in an empty, only sub-item block', () => {
					setModelData( model, modelList( [
						'* a',
						'  # b',
						'    * []',
						'  #'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'  # b',
						'  # []',
						'  #'
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 2 )
					] );

					sinon.assert.calledOnce( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.true;
				} );

				it( 'should create another block when the selection at the start of a non-empty first block', () => {
					setModelData( model, modelList( [
						'* a[]',
						'  b',
						'  c'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'  []',
						'  b',
						'  c'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should create another block when the selection at the end of a non-empty first block', () => {
					setModelData( model, modelList( [
						'* []a',
						'  b',
						'  c'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* ',
						'  []a',
						'  b',
						'  c'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should create another block when the selection at the start of a non-empty last block', () => {
					setModelData( model, modelList( [
						'* a',
						'  b',
						'  []c'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'  b',
						'  ',
						'  []c'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should create another block when the selection at the end of a non-empty last block', () => {
					setModelData( model, modelList( [
						'* a',
						'  b',
						'  c[]'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'  b',
						'  c',
						'  []'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should create another block when the selection in an empty middle block', () => {
					setModelData( model, modelList( [
						'* a',
						'  []',
						'  c'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'  ',
						'  []',
						'  c'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should create another list item when the selection in an empty last block (two blocks in total)', () => {
					setModelData( model, modelList( [
						'* a',
						'  []'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'* [] {id:a00}'
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 1 )
					] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.calledOnce( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.true;
				} );

				it( 'should create another list item when the selection in an empty last block (three blocks in total)', () => {
					setModelData( model, modelList( [
						'* a',
						'  b',
						'  []'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'  b',
						'* [] {id:a00}'
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 2 )
					] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.calledOnce( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.true;
				} );

				it( 'should create another list item when the selection in an empty last block (followed by a list item)', () => {
					setModelData( model, modelList( [
						'* a',
						'  b',
						'  []',
						'* '
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'  b',
						'* [] {id:a00}',
						'* '
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 2 )
					] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.calledOnce( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.true;
				} );
			} );
		} );

		describe( 'non-collapsed selection', () => {
			describe( 'with just one block per list item', () => {
				it( 'should create another list item if the selection contains some content at the end of the list item', () => {
					setModelData( model, modelList( [
						'* a[b]'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'* [] {id:a00}'
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 1 )
					] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.calledOnce( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should create another list item if the selection contains some content at the start of the list item', () => {
					setModelData( model, modelList( [
						'* [a]b'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* ',
						'* []b {id:a00}'
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 1 )
					] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.calledOnce( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should clean the content and turn off the list if slection contains all content at the zero indent level', () => {
					setModelData( model, modelList( [
						'* [a',
						'* b]'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'[]'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( splitCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should clean the content and move the selection when it contains some content at the zero indent level', () => {
					setModelData( model, modelList( [
						'* a[b',
						'* b]'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'* []'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( splitCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should clean the content when the selection contains all content at a deeper indent level', () => {
					setModelData( model, modelList( [
						'* a',
						'  # b',
						'    * [c',
						'    * d]'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'  # b',
						'    * []'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				describe( 'cross-indent level selection', () => {
					it( 'should clean the content and remove list across different indentation levels (list the only content)', () => {
						setModelData( model, modelList( [
							'* [ab',
							'  # cd]'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'[]'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the content across different indentation levels (one level, entire blocks)', () => {
						setModelData( model, modelList( [
							'foo',
							'* [ab',
							'  # cd]'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'foo',
							'* []'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the content across different indentation levels (one level, subset of blocks)', () => {
						setModelData( model, modelList( [
							'foo',
							'* a[b',
							'  # c]d'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'foo',
							'* a',
							'  # []d'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the content across different indentation levels (two levels, entire blocks)', () => {
						setModelData( model, modelList( [
							'* [ab',
							'  # cd',
							'    * ef]',
							'    * gh'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'* []',
							'  * gh {id:003}'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the content across different indentation levels (two levels, subset of blocks)', () => {
						setModelData( model, modelList( [
							'* a[b',
							'  # cd',
							'    * e]f',
							'    * gh'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'* a',
							'  * []f {id:002}',
							'  * gh {id:003}'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the content across different indentation levels (three levels, entire blocks)', () => {
						setModelData( model, modelList( [
							'foo',
							'* [ab',
							'  # cd',
							'    * ef',
							'    * gh]'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'foo',
							'* []'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the content and remove list across different indentation levels ' +
						'(three levels, list the only content)', () => {
						setModelData( model, modelList( [
							'* [ab',
							'  # cd',
							'    * ef',
							'    * gh]'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'[]'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the content across different indentation levels (three levels, subset of blocks)', () => {
						setModelData( model, modelList( [
							'* a[b',
							'  # cd',
							'    * ef',
							'      # g]h',
							'    * ij'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'* a',
							'  # []h {id:003}',
							'* ij {id:004}'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the content across different indentation levels (one level, start at first, entire blocks)', () => {
						setModelData( model, modelList( [
							'* ab',
							'  # [cd',
							'    * ef',
							'    * gh]'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'* ab',
							'  # []'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the content across different indentation levels (one level, start at first, part of blocks)', () => {
						setModelData( model, modelList( [
							'* ab',
							'  # c[d',
							'    * ef',
							'    * g]h'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'* ab',
							'  # c',
							'    * []h {id:003}'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the content across different indentation levels (level up then down, subset of blocks)', () => {
						setModelData( model, modelList( [
							'* ab',
							'  # c[d',
							'    * ef',
							'  # g]h'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'* ab',
							'  # c',
							'  # []h {id:003}'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the content across different indentation levels (level up then down, entire of blocks)', () => {
						setModelData( model, modelList( [
							'* ab',
							'  # [cd',
							'    * ef',
							'  # gh]',
							'* ij'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'* ab',
							'  # []',
							'* ij {id:004}'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the content across different indentation levels (level up then down, preceded by an item)', () => {
						setModelData( model, modelList( [
							'* ab',
							'  # cd',
							'  # [ef',
							'    * gh',
							'  # ij]',
							'* kl'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'* ab',
							'  # cd',
							'  # []',
							'* kl {id:005}'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );
				} );
			} );

			describe( 'with multiple blocks in a list item', () => {
				it( 'should clean the selected content (partial blocks)', () => {
					setModelData( model, modelList( [
						'* a[b',
						'  c]d'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* a',
						'* []d {id:a00}'
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 1 )
					] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.calledOnce( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should clean the selected content (entire blocks)', () => {
					setModelData( model, modelList( [
						'foo',
						'* [ab',
						'  cd]'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'foo',
						'* []'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should clean the selected content (entire block, middle one)', () => {
					setModelData( model, modelList( [
						'* ab',
						'  [cd]',
						'  ef'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* ab',
						'  []',
						'  ef'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should clean the selected content (entire blocks, starting from the second)', () => {
					setModelData( model, modelList( [
						'* ab',
						'  [cd',
						'  ef]'
					] ) );

					view.document.fire( eventInfo, domEventData );

					// Generally speaking, we'd rather expect something like this:
					//	* ab
					//	  []
					// But there is no easy way to tell what the original selection looked like when it came to EnterCommand#afterExecute.
					// Enter deletes all the content first [cd, ef] and in #afterExecute it looks like the original selection was:
					//	* ab
					//	  []
					// and the algorithm falls back to splitting in this case. There's even a test for this kind of selection.
					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* ab',
						'* [] {id:a00}'
					] ) );

					expect( changedBlocks ).to.deep.equal( [
						modelRoot.getChild( 1 )
					] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.calledOnce( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should clean the selected content (partial blocks, starting from the second)', () => {
					setModelData( model, modelList( [
						'* ab',
						'  c[d',
						'  e]f'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* ab',
						'  c',
						'  []f'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should clean the selected content (entire blocks, three blocks in total)', () => {
					setModelData( model, modelList( [
						'* [ab',
						'  cd',
						'  ef]',
						'* gh'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* []',
						'* gh {id:003}'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should clean the selected content (entire blocks, across list items)', () => {
					setModelData( model, modelList( [
						'foo',
						'* [ab',
						'  cd',
						'  ef',
						'* gh]'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'foo',
						'* []'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should clean the selected content (entire blocks + a partial block, across list items)', () => {
					setModelData( model, modelList( [
						'* [ab',
						'  cd',
						'  ef',
						'* g]h'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* ',
						'* []h {id:003}'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				it( 'should clean the selected content (partial blocks, across list items)', () => {
					setModelData( model, modelList( [
						'* ab',
						'  cd',
						'  e[f',
						'* g]h'
					] ) );

					view.document.fire( eventInfo, domEventData );

					expect( getModelData( model ) ).to.equalMarkup( modelList( [
						'* ab',
						'  cd',
						'  e',
						'* []h'
					] ) );

					expect( changedBlocks ).to.deep.equal( [] );

					sinon.assert.notCalled( outdentCommandExecuteSpy );
					sinon.assert.notCalled( splitCommandExecuteSpy );

					sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
					expect( eventInfo.stop.called ).to.be.undefined;
				} );

				describe( 'cross-indent level selection', () => {
					it( 'should clean the selected content (partial blocks)', () => {
						setModelData( model, modelList( [
							'* ab',
							'  * cd',
							'    e[f',
							'    gh',
							'    * i]j'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'* ab',
							'  * cd',
							'    e',
							'    * []j {id:004}'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the selected content (partial blocks + entire block)', () => {
						setModelData( model, modelList( [
							'* ab',
							'  * cd',
							'    e[f',
							'    gh',
							'    * ij]'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'* ab',
							'  * cd',
							'    e',
							'    * [] {id:004}'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );

					it( 'should clean the selected content (across two middle levels)', () => {
						setModelData( model, modelList( [
							'* ab',
							'  c[d',
							'  * ef',
							'    g]h',
							'    * ij'
						] ) );

						view.document.fire( eventInfo, domEventData );

						expect( getModelData( model ) ).to.equalMarkup( modelList( [
							'* ab',
							'  c',
							'  * []h',
							'    * ij {id:004}'
						] ) );

						expect( changedBlocks ).to.deep.equal( [] );

						sinon.assert.notCalled( outdentCommandExecuteSpy );
						sinon.assert.notCalled( splitCommandExecuteSpy );

						sinon.assert.calledOnce( domEventData.domEvent.preventDefault );
						expect( eventInfo.stop.called ).to.be.undefined;
					} );
				} );
			} );
		} );
	} );
} );