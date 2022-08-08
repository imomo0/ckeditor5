/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module esave-save/esavesaveui
 */

 import { Plugin } from 'ckeditor5/src/core';
 import { ButtonView } from 'ckeditor5/src/ui';
 
 import esaveSaveIcon from '../theme/icons/horizontalline.svg';
 
 /**
  * The horizontal line UI plugin.
  *
  * @extends module:core/plugin~Plugin
  */
 export default class HorizontalLineUI extends Plugin {
     /**
      * @inheritDoc
      */
     static get pluginName() {
         return 'HorizontalLineUI';
     }
 
     /**
      * @inheritDoc
      */
     init() {
         const editor = this.editor;
         const t = editor.t;
 
         // Add the `horizontalLine` button to feature components.
         editor.ui.componentFactory.add( 'esavesave', locale => {
             const command = editor.commands.get( 'esavesave' );
             const view = new ButtonView( locale );
 
             view.set( {
                 label: t( 'Horizontal line' ),
                 icon: esaveSaveIcon,
                 tooltip: true
             } );
 
             view.bind( 'isEnabled' ).to( command, 'isEnabled' );
 
             // Execute the command.
             this.listenTo( view, 'execute', () => {
                 editor.execute( 'esavesave' );
                 editor.editing.view.focus();
             } );
 
             return view;
         } );
     }
 }
 