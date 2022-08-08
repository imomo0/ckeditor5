/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

// The editor creator to use.
import ClassicEditorBase from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';

import Essentials from '@ckeditor/ckeditor5-essentials/src/essentials';
import UploadAdapter from '@ckeditor/ckeditor5-adapter-ckfinder/src/uploadadapter';
import Autoformat from '@ckeditor/ckeditor5-autoformat/src/autoformat';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import Italic from '@ckeditor/ckeditor5-basic-styles/src/italic';
import Underline from '@ckeditor/ckeditor5-basic-styles/src/underline';
import Strikethrough from '@ckeditor/ckeditor5-basic-styles/src/strikethrough';
import Code from '@ckeditor/ckeditor5-basic-styles/src/code';
import Subscript from '@ckeditor/ckeditor5-basic-styles/src/subscript';
import Superscript from '@ckeditor/ckeditor5-basic-styles/src/superscript';
import BlockQuote from '@ckeditor/ckeditor5-block-quote/src/blockquote';
//import CKBox from '@ckeditor/ckeditor5-ckbox/src/ckbox';
//import CKFinder from '@ckeditor/ckeditor5-ckfinder/src/ckfinder';
import EasyImage from '@ckeditor/ckeditor5-easy-image/src/easyimage';
import Heading from '@ckeditor/ckeditor5-heading/src/heading';
import Image from '@ckeditor/ckeditor5-image/src/image';
import ImageCaption from '@ckeditor/ckeditor5-image/src/imagecaption';
import ImageStyle from '@ckeditor/ckeditor5-image/src/imagestyle';
import ImageToolbar from '@ckeditor/ckeditor5-image/src/imagetoolbar';
import ImageUpload from '@ckeditor/ckeditor5-image/src/imageupload';
import ImageResizeEditing from '@ckeditor/ckeditor5-image/src/imageresize/imageresizeediting';
import ImageResizeHandles from '@ckeditor/ckeditor5-image/src/imageresize/imageresizehandles';
import Indent from '@ckeditor/ckeditor5-indent/src/indent';
import IndentBlock from '@ckeditor/ckeditor5-indent/src/indentblock';
import Link from '@ckeditor/ckeditor5-link/src/link';
import List from '@ckeditor/ckeditor5-list/src/list';
import MediaEmbed from '@ckeditor/ckeditor5-media-embed/src/mediaembed';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import PasteFromOffice from '@ckeditor/ckeditor5-paste-from-office/src/pastefromoffice';
import PictureEditing from '@ckeditor/ckeditor5-image/src/pictureediting';
import Table from '@ckeditor/ckeditor5-table/src/table';
import TableToolbar from '@ckeditor/ckeditor5-table/src/tabletoolbar';
import TableColumnResize from '@ckeditor/ckeditor5-table/src/tablecolumnresize';
import TableCaption from '@ckeditor/ckeditor5-table/src/tablecaption';
import TableProperties from '@ckeditor/ckeditor5-table/src/tableproperties';
import TableCellProperties from '@ckeditor/ckeditor5-table/src/tablecellproperties';
import TextTransformation from '@ckeditor/ckeditor5-typing/src/texttransformation';
import CloudServices from '@ckeditor/ckeditor5-cloud-services/src/cloudservices';
import Alignment from '@ckeditor/ckeditor5-alignment/src/alignment';
import SimpleUploadAdapter from '@ckeditor/ckeditor5-upload/src/adapters/simpleuploadadapter';
import Clipboard from '@ckeditor/ckeditor5-clipboard/src/clipboard';
import Font from '@ckeditor/ckeditor5-font/src/font';
import FindAndReplace from '@ckeditor/ckeditor5-find-and-replace/src/findandreplace';
import Highlight from '@ckeditor/ckeditor5-highlight/src/highlight';
import HorizontalLine from '@ckeditor/ckeditor5-horizontal-line/src/horizontalline';
import TodoList from '@ckeditor/ckeditor5-list/src/todolist';
import SpecialCharacters from '@ckeditor/ckeditor5-special-characters/src/specialcharacters';
import SpecialCharactersEssentials from '@ckeditor/ckeditor5-special-characters/src/specialcharactersessentials';
import CodeBlock from '@ckeditor/ckeditor5-code-block/src/codeblock';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import ButtonView from '@ckeditor/ckeditor5-ui/src/button/buttonview';
import imageIcon from '@ckeditor/ckeditor5-core/theme/icons/cog.svg';
//import saveIcon from '@ckeditor/ckeditor5-core/theme/icons/save.svg';

class EsaveSave extends Plugin {

	static get pluginName() {
		return 'EsaveSave';
	}

    init() {
        const editor = this.editor;

        const btn = editor.ui.componentFactory.add( 'esaveSave', locale => {
            const view = new ButtonView( locale );

            view.set( {
                label: 'Lagre',
				class: '',
                //icon: saveIcon,
				withText: true,
                tooltip: true,
				isEsaveSave: true
            } );

            // Callback executed once the image is clicked.
            view.on( 'execute', () => {
				var xhr = new XMLHttpRequest();
				xhr.onreadystatechange = function() {
					if (xhr.readyState == XMLHttpRequest.DONE) {
						if(xhr.status == 200) view.class = "";
					}
				}

				xhr.open("POST", editor.config._config.simpleUpload.uploadUrl, true);
				xhr.setRequestHeader('Content-Type', 'application/json');
				xhr.setRequestHeader('unid', editor.config._config.simpleUpload.headers.unid);
				xhr.send(JSON.stringify({text: editor.getData(), url: editor.config._config.simpleUpload.uploadUrl, unid: editor.config._config.simpleUpload.headers.unid}));
            }
			);

            return view;
        } );
    }
}

export default class ClassicEditor extends ClassicEditorBase {}

// Plugins to include in the build.
ClassicEditor.builtinPlugins = [
	Essentials,
	UploadAdapter,
	Font,
	Autoformat,
	Bold,
	Italic,
	Underline,
	Strikethrough,
	Code,
	Subscript,
	Superscript,
	BlockQuote,
//	CKBox,
//	CKFinder,
	CloudServices,
	Clipboard,
	EasyImage,
	Heading,
	Image,
	ImageCaption,
	ImageStyle,
	ImageToolbar,
	ImageUpload,
	ImageResizeEditing,
	ImageResizeHandles,
	Indent,
	IndentBlock,
	Link,
	List,
	MediaEmbed,
	Paragraph,
	PasteFromOffice,
	PictureEditing,
	Table,
	TableToolbar,
	TableColumnResize,
	TableCaption,
	TableProperties,
	TableCellProperties,
	TextTransformation,
	Alignment,
	SimpleUploadAdapter,
	FindAndReplace,
	Highlight,
	HorizontalLine,
	TodoList,
	SpecialCharacters,
	SpecialCharactersEssentials,
	CodeBlock,
	EsaveSave
];

// Editor configuration.
ClassicEditor.defaultConfig = {
	toolbar: {
		items: ['undo','redo','|','heading','|','alignment','|','bold','italic','underline','strikethrough','subscript','superscript','|','link','|',
			'bulletedList','numberedList','todoList',
			'-',
			'outdent','indent','|','fontFamily','fontSize','fontColor','fontBackgroundColor','|','code','codeBlock','|',
			'insertTable','|','horizontalLine','|','uploadImage','mediaEmbed','blockQuote','|','findAndReplace','highlight','specialCharacters'
		],
		shouldNotGroupWhenFull: true
	},
	image: {
		resizeOptions: [
			{
				name: 'resizeImage:original',
				value: null,
				icon: 'original'
			},
			{
				name: 'resizeImage:50',
				value: 50,
				icon: '50%'
			}
		],
		toolbar: [
			'imageStyle:inline',
			'imageStyle:wrapText',
			'imageStyle:breakText',
			'|',
			'toggleImageCaption',
			'imageTextAlternative',
			'|',
			'resizeImage'
		]
	},
	fontSize: {
		options: [
			9,
			11,
			13,
			'default',
			17,
			19,
			21
		]
	},
	fontFamily: {
		options: [
			'default',
			'Arial, Helvetica, sans-serif',
			'Courier New, Courier, monospace',
			'Georgia, serif',
			'Lucida Sans Unicode, Lucida Grande, sans-serif',
			'Tahoma, Geneva, sans-serif',
			'Times New Roman, Times, serif',
			'Trebuchet MS, Helvetica, sans-serif',
			'Verdana, Geneva, sans-serif'
		],
		supportAllValues: true
	},
	table: {
		contentToolbar: [
			'tableColumn',
			'tableRow',
			'mergeTableCells',
			'tableProperties',
			'tableCellProperties'
		]
	},
	codeBlock: {
		languages: [
			// Do not render the CSS class for the plain text code blocks.
			{ language: 'plaintext', label: 'Plain text', class: '' },

			// Use the "php-code" class for PHP code blocks.
			{ language: 'php', label: 'PHP', class: 'php-code' },

			// Use the "js" class for JavaScript code blocks.
			// Note that only the first ("js") class will determine the language of the block when loading data.
			{ language: 'javascript', label: 'JavaScript', class: 'js javascript js-code' },

			// Python code blocks will have the default "language-python" CSS class.
			{ language: 'python', label: 'Python' }
		]
	},
	indentBlock: {
		offset: 2,
		unit: 'em'
	},

	// This value must be kept in sync with the language defined in webpack.config.js.
	language: 'en'
};


