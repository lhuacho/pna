import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { ApiService } from '../../services/api.service';
import Tools from '../../utils/tools';
import { FormService } from 'src/app/services/form.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit {

  _win:any = window;
  tools = new Tools();

  expierences:any = [];
  menciones:any = [];

  expierencePrint:any = {};

  constructor(
    private userService: UserService,
    private apiService: ApiService,
    private formService: FormService
  ) {
    let _root = this;

    _root.tools.showPreloader();

    localStorage.removeItem('postulacion');
    localStorage.removeItem('experiencia');

    if(!localStorage.getItem('user_profile')) {
      _root.userService.profile()
      .then((resp:any) => {
        localStorage.setItem('user_profile', _root.tools.cryptrData(JSON.stringify(resp.data)));
      })
      .catch((errp) => {
      });
    }

    _root.apiService.categorias()
    .then((res:any) => {
      for(let item of res.body.data) {
        if(item.recurso == 'categoria') {
          
        }
        if(item.recurso == 'mencion') {
          _root.menciones.push(item);
        }
      }
      return _root.apiService.postulacionById(0);
    })
    .then((res:any) => {
      if(res.data !== undefined) {
        if( res.data.length > 0 ) {
          for(let item of res.data) {
            item.date = _root.tools.convertDate(item.fecha_registro);
            _root.expierences.push(item);
          }
        }
      }
      _root.tools.hidePreloader();
    })
    .catch((errp) => {
      _root.tools.hidePreloader();
    });
  }

  ngOnInit(): void {
    
  }

  deletePostulacion(id) {
    let _root = this;

    _root.apiService.postulacionDelete(id)
    .then((res:any) => {
      if(res.status == 200) {
        window.location.reload();
      }
      else {
        _root.tools.showToastr('', 'No se pudo eliminar la postulación', 'error', 2000);
      }
    })
    .catch((err:any) => {
      _root.tools.showToastr('', 'No se pudo eliminar la postulación', 'error', 2000);
    });
  }

  getMencionByCategorie(idCategoria) {
    let _root = this;
    let result = '';
    for(let item of _root.menciones ) {
      if(item.id == idCategoria) {
        result = item.label;
      }
    }

    return result;
  }

  onClickPreview(event, item) {
    event.preventDefault();

    let _root = this;
    let preguntasMencion = [];
    let preguntasTablaAnswer = [];
    let _preguntasMencionTabla = [];

    _root.expierencePrint = {
      postulacion: item,
      experiencia: {},
      user: JSON.parse(_root.tools.decryptrData(localStorage.getItem('user_profile'))),
      menciones: [],
      anexos: [],
      imagenes: [],
      preguntasTablaAnswer: [],
      mencionTitle: '',
      mencionDesc: '',
    };

    _root.tools.showPreloader();

    _root.apiService.preguntaTablaSavedList(item.id_postulacion)
    .then((res:any) => {
      if(res.status == 200) {
        if( res.body.data.length > 0 ) {
          preguntasTablaAnswer = res.body.data;
        }
      }

      return _root.apiService.preguntaTablaListar(item.id_mencion);
    })
    .then((res:any) => {
      if(res.status == 200) {
        if( res.body.data.length > 0 ) {
          _preguntasMencionTabla = res.body.data;
        }
      }
      
      return _root.apiService.preguntaListar(item.id_mencion);
    })
    .then((res:any) => {
      if(res.status == 200) {
        if( res.body.data.length > 0 ) {
          let _count = 0;
          let _data = [];
          for(let item of res.body.data) {
            if( _count == 0 ) {
              let _formMencion = _root.formService.getFormMencion(item.titulo_mencion);
              _root.expierencePrint.mencionTitle = item.titulo_mencion;
              _root.expierencePrint.mencionDesc = _formMencion.description;
              _data = _formMencion.fields;
            }
            _count = (_count + 1);
          }

          for(let item of _data) {
            if(item.tipo_campo == 'tabla') {
              for(let ittem of _preguntasMencionTabla) {
                if(item.id_campo == ittem.id_campo) {
                  ittem.answers = {};
                  item.tabla = ittem;
                }
              }
            }
            item.value = '';
          }
          preguntasMencion = _data;
        }
      }

      return _root.apiService.preguntaSavedList(item.id_postulacion);
    })
    .then((res:any) => {
      if(res.status == 200) {
        if( res.body.data.length > 0 ) {
          for(let item of res.body.data) {
            for(let itemj of preguntasMencion) {
              if(item.id_campo == itemj.id_campo) {
                itemj.value = item.valor_texto;
              }
            }
          }
        }
      }

      _root.expierencePrint.menciones = preguntasMencion;

      return _root.apiService.experienciaById(item.id_postulacion);
    })
    .then((res:any) => {
      if( res.data !== undefined ) {
        _root.expierencePrint.experiencia = res.data;
      }

      return _root.apiService.listFile(item.id_postulacion);
    })
    .then((res:any) => {
      let _docs = [];
      let _imgs = [];

      for(let file of res) {
        if(file.tipo_documento == 'SU') {
          _docs.push(file.nombre_documento);
        }
        else if(file.tipo_documento == 'IR') {
          _imgs.push(file.nombre_documento);
        }
      }

      _root.expierencePrint.anexos = _docs;
      _root.expierencePrint.imagenes = _imgs;
      _root.expierencePrint.preguntasTablaAnswer = preguntasTablaAnswer;

      console.log( _root.expierencePrint );

      setTimeout(() => {
        let printContents, popupWin;
        printContents = _root.formService.getPreviewPostulacion(_root.expierencePrint);
        popupWin = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto');
        popupWin.document.open();
        popupWin.document.write(`
          <html>
            <head>
              <title>${item.id_postulacion}</title>
              <style>
              ol {
                list-style: none!important;
              }
              .mencion-content {
                padding: 0 10px!important;
                font-size: 13px!important;
                font-weight: normal!important;
              }
              .mencion-content * {
                font-size: 13px!important;
                font-weight: normal!important;
              }
              .mencion-content p {
                font-size:12px!important;
                font-family: "Arial",sans-serif!important;
                color:#002060!important;
              }
              .mencion-content span, .mencion-content label {
                font-size:12px!important;
                font-family:"Arial",sans-serif!important;
                color:#002060!important;
              }
              .ml-5 {
                margin-left: 3rem!important;
              }
              .ml-3 {
                margin-left: 1rem!important;
              }
              </style>
            </head>
            <body>${printContents}</body>
          </html>
          `
        );
        popupWin.document.close();
      }, 1000);

      _root.tools.hidePreloader();
    })
    .catch((err:any) => {
      _root.tools.hidePreloader();
    });
  }

}
